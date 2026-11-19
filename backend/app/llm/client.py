import os
import re

import httpx

from app.config import settings

CHUNK_PATTERN = re.compile(
    r"###\s+([^\n:]+):(\d+)-(\d+)\n(.*?)(?=\n\n###|\n\nQuestion:|$)",
    re.DOTALL,
)


class LLMUnavailable(Exception):
    pass


class OllamaClient:
    def generate(self, system: str, user: str) -> str:
        try:
            r = httpx.post(
                f"{settings.ollama_url}/api/chat",
                timeout=15,
                json={
                    "model": settings.ollama_model,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            r.raise_for_status()
            return r.json()["message"]["content"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise LLMUnavailable("Ollama did not answer") from exc


class GeminiClient:
    def generate(self, system: str, user: str) -> str:
        api_key = (
            settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        ).strip()
        if not api_key:
            raise LLMUnavailable("LLM_PROVIDER is gemini but GEMINI_API_KEY is empty")

        preferred = settings.gemini_model or "gemini-3-flash-preview"
        candidates = [
            preferred,
            "gemini-3-flash-preview",
            "gemini-3.8-flash",
            "gemini-flash-latest",
        ]
        seen_models = set()
        last_error = None

        for model in candidates:
            if model in seen_models:
                continue
            seen_models.add(model)
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent"
            )
            try:
                r = httpx.post(
                    url,
                    timeout=30,
                    headers={"x-goog-api-key": api_key},
                    json={
                        "systemInstruction": {"parts": [{"text": system}]},
                        "contents": [{"role": "user", "parts": [{"text": user}]}],
                    },
                )
                if r.status_code == 200:
                    data = r.json()
                    candidates_list = data.get("candidates", [])
                    if candidates_list and "content" in candidates_list[0]:
                        parts = candidates_list[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                elif r.status_code in (404, 429, 503):
                    last_error = f"{model} returned {r.status_code}"
                    continue
                else:
                    r.raise_for_status()
            except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
                last_error = exc
                continue

        raise LLMUnavailable(f"Gemini did not answer: {last_error}")


def _clean_docstring(doc: str) -> str:
    """Extract a clean, human-readable sentence from a docstring."""
    if not doc:
        return ""
    # Strip quotes and leading/trailing whitespace
    cleaned = doc.strip().strip("\"'").strip()
    # Take first sentence or up to 140 chars
    first_line = cleaned.split("\n")[0].strip()
    if len(first_line) > 130:
        first_line = first_line[:127] + "..."
    # Ensure it ends with a period if not empty
    if first_line and not first_line.endswith((".", "!", "?")):
        first_line += "."
    return first_line


def _friendly_name(name: str) -> str:
    """Convert snake_case or CamelCase to a friendly description."""
    parts = re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)|\d+", name)
    return " ".join(parts).lower()


def _categorize_path(file_path: str) -> str:
    """Categorize file path into workflow stage."""
    low = file_path.lower()
    if any(
        k in low
        for k in ("config", "settings", "db", "database", "connection", "setup", "init")
    ):
        return "setup"
    if any(
        k in low
        for k in (
            "data",
            "feature",
            "validate",
            "ingest",
            "marker",
            "candle",
            "schema",
            "input",
        )
    ):
        return "data"
    if any(
        k in low
        for k in ("scheduler", "main", "api", "server", "app", "cli", "route", "run")
    ):
        return "service"
    if any(
        k in low
        for k in (
            "strategy",
            "engine",
            "process",
            "calc",
            "core",
            "service",
            "handler",
            "order",
            "payment",
            "eval",
            "news",
        )
    ):
        return "core"
    return "general"


class GroundedFallbackClient:
    """Intelligent codebase explainer that produces clear, easy-to-understand answers

    grounded in the repository AST chunks with verified citations.
    """

    def generate(self, system: str, user: str) -> str:
        q_match = re.search(r"Question:\s*(.*)$", user, re.DOTALL)
        question = q_match.group(1).strip() if q_match else ""
        q_lower = question.lower()

        chunks = CHUNK_PATTERN.findall(user)
        if not chunks:
            return "I could not find anything about that in this project."

        # Extract target search terms from question to spotlight specific function/class requests
        q_words = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]+", question)
        stop_words = {
            "what",
            "does",
            "where",
            "which",
            "explain",
            "about",
            "project",
            "code",
            "repo",
            "function",
            "class",
            "module",
            "work",
            "mean",
            "system",
            "file",
            "this",
            "that",
            "from",
            "with",
            "show",
            "tell",
            "used",
            "using",
            "call",
            "calls",
            "called",
        }
        candidate_targets = [
            w.lower() for w in q_words if len(w) > 2 and w.lower() not in stop_words
        ]

        categorized_items: list[tuple[str, str, bool]] = []
        seen_citations: set[str] = set()
        seen_modules: set[str] = set()
        endpoint_items: list[str] = []

        for file_path, start_str, end_str, code in chunks:
            if file_path.endswith("__init__.py"):
                continue

            start_line = int(start_str)
            end_line = int(end_str)
            clean_code = code.strip()
            cat = _categorize_path(file_path)

            citation = f"[{file_path}:{start_line}-{end_line}]"
            if citation in seen_citations:
                continue
            seen_citations.add(citation)

            # 1. Extract functions and classes (excluding private dunders)
            funcs = [
                f
                for f in re.findall(r"def\s+([a-zA-Z0-9_]+)\s*\(", clean_code)
                if not f.startswith("__")
            ]
            classes = re.findall(r"class\s+([a-zA-Z0-9_]+)", clean_code)

            # Check if this chunk directly defines a target symbol from the user's question
            is_target_hit = any(
                any(t == f.lower() for t in candidate_targets) for f in funcs
            ) or any(any(t == c.lower() for t in candidate_targets) for c in classes)

            # 2. Extract docstring
            doc_match = re.search(r'"""([\s\S]*?)"""', clean_code) or re.search(
                r"'''([\s\S]*?)'''", clean_code
            )
            raw_doc = doc_match.group(1) if doc_match else ""
            doc_summary = _clean_docstring(raw_doc)

            # 3. Check for API routes
            route_match = re.search(
                r'@(?:app|router)\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']',
                clean_code,
            )
            if route_match:
                method = route_match.group(1).upper()
                endpoint = route_match.group(2)
                desc = doc_summary or f"Serves `{method} {endpoint}` requests."
                if funcs:
                    msg = f"• **API Endpoint (`{method} {endpoint}`)**: Handled by `{funcs[0]}()` in {citation} — {desc}"
                else:
                    msg = f"• **API Endpoint (`{method} {endpoint}`)**: Defined in {citation} — {desc}"
                categorized_items.append((cat, msg, is_target_hit))
                endpoint_items.append(msg)
                continue

            # 4. Check for router inclusion
            if "include_router" in clean_code:
                prefix_match = re.search(r'prefix=["\']([^"\']+)["\']', clean_code)
                prefix = prefix_match.group(1) if prefix_match else "API routes"
                categorized_items.append(
                    (
                        cat,
                        f"• **Router Configuration**: Connects `{prefix}` endpoints into the main application in {citation}.",
                        False,
                    )
                )
                continue

            # 5. Class definition
            if classes:
                cls_name = classes[0]
                methods_str = ", ".join(f"`{m}()`" for m in funcs[:2]) if funcs else ""
                method_phrase = f" with method(s) {methods_str}" if methods_str else ""
                desc = doc_summary or f"Manages {_friendly_name(cls_name)} operations."
                categorized_items.append(
                    (
                        cat,
                        f"• **Class `{cls_name}`**: Defined in {citation}{method_phrase} — {desc}",
                        is_target_hit,
                    )
                )
                continue

            # 6. Function definition
            if funcs:
                fn_name = funcs[0]
                desc = doc_summary or f"Implements {_friendly_name(fn_name)} logic."
                categorized_items.append(
                    (
                        cat,
                        f"• **Function `{fn_name}()`**: Located in {citation} — {desc}",
                        is_target_hit,
                    )
                )
                continue

            # 7. General module code (avoid duplicate mentions of the same module file)
            if file_path not in seen_modules:
                seen_modules.add(file_path)
                file_stem = file_path.rsplit("/", 1)[-1].replace(".py", "")
                friendly_stem = _friendly_name(file_stem)
                categorized_items.append(
                    (
                        cat,
                        f"• **Module `{file_path}`**: Implements core {friendly_stem} logic in {citation}.",
                        False,
                    )
                )

        if not categorized_items:
            return "I could not find anything about that in this project."

        # Detect user intent
        is_usage = any(
            phrase in q_lower
            for phrase in (
                "how to use",
                "how do i use",
                "how can i use",
                "how to run",
                "how to integrate",
                "how to install",
                "getting started",
                "how to start",
                "usage",
                "use this in",
                "integrate this",
            )
        )

        is_endpoints = any(
            w in q_lower
            for w in (
                "endpoint",
                "endpoints",
                "api route",
                "api routes",
                "api",
                "routes",
                "route",
                "urls",
                "url",
            )
        )

        is_location = any(
            phrase in q_lower
            for phrase in (
                "where is",
                "where are",
                "which file",
                "who handles",
                "where does",
            )
        )

        is_general = any(
            phrase in q_lower
            for phrase in (
                "what does this project do",
                "what is this repo",
                "what does this repo do",
                "overview",
                "architecture",
                "purpose",
            )
        )

        # ── Case 1: Specific Symbol Spotlight (Targeted Function / Class hit) ──
        target_hits = [t for _, t, hit in categorized_items if hit]
        other_items = [t for _, t, hit in categorized_items if not hit]
        if target_hits and not is_usage and not is_general and not is_endpoints:
            lines = [
                "Here is the definition and role of the target component in this codebase:",
                "",
                "### 🎯 Primary Definition",
            ]
            lines.extend(target_hits[:3])
            if other_items:
                lines.append("")
                lines.append("### Related Components & Callers")
                lines.extend(other_items[:3])
            lines.append("")
            lines.append(
                "Each citation links directly to its source lines in the code viewer."
            )
            return "\n".join(lines)

        # ── Case 2: API Endpoints Discovery ──
        if is_endpoints and endpoint_items:
            lines = [
                "Here are the primary API endpoints defined in this repository:",
                "",
            ]
            for ep in endpoint_items[:6]:
                lines.append(ep)
            if other_items:
                lines.append("")
                lines.append("### Connected Service Handlers")
                lines.extend(other_items[:2])
            lines.append("")
            lines.append(
                "Click on any endpoint citation to inspect the request schema and route handler."
            )
            return "\n".join(lines)

        # ── Case 3: Usage & Getting Started Guide ──
        if is_usage:
            setup_items = [t for c, t, _ in categorized_items if c == "setup"]
            data_items = [t for c, t, _ in categorized_items if c == "data"]
            core_items = [t for c, t, _ in categorized_items if c == "core"]
            service_items = [t for c, t, _ in categorized_items if c == "service"]

            lines = [
                "To integrate and use this codebase in your project, follow this step-by-step workflow:",
                "",
            ]
            step_idx = 1
            if setup_items:
                lines.append(f"### Step {step_idx}: Setup & Configuration")
                lines.extend(setup_items[:2])
                lines.append("")
                step_idx += 1

            if data_items:
                lines.append(f"### Step {step_idx}: Prepare & Validate Input Data")
                lines.extend(data_items[:2])
                lines.append("")
                step_idx += 1

            if core_items:
                lines.append(
                    f"### Step {step_idx}: Execute Core Engine & Strategy Logic"
                )
                lines.extend(core_items[:2])
                lines.append("")
                step_idx += 1

            if service_items:
                lines.append(
                    f"### Step {step_idx}: Run Service or Background Automation"
                )
                lines.extend(service_items[:2])
                lines.append("")
                step_idx += 1

            if step_idx <= 2:
                lines = [
                    "To integrate and use this codebase in your project, follow this step-by-step workflow:",
                    "",
                ]
                all_items = [t for _, t, _ in categorized_items]
                for idx, itm in enumerate(all_items[:4], start=1):
                    lines.append(f"### Step {idx}: Module Integration")
                    lines.append(itm)
                    lines.append("")

            lines.append(
                "💡 **Quick Start Tip**: You can directly import the core modules into your Python scripts or start the service via its main entry point."
            )
            return "\n".join(lines)

        # ── Case 4: Location Query ("Where is...") ──
        if is_location:
            lines = [
                f'In this codebase, **"{question}"** is primarily handled in:',
                "",
            ]
            for _, itm, _ in categorized_items[:4]:
                lines.append(itm)
            lines.append("")
            lines.append(
                "Click on any citation above to jump directly to the code implementation."
            )
            return "\n".join(lines)

        # ── Case 5: Project Overview ──
        if is_general:
            lines = [
                "Here is an easy-to-understand breakdown of what this project does and how its core components work together:",
                "",
            ]
            for _, itm, _ in categorized_items[:5]:
                lines.append(itm)
            lines.append("")
            lines.append(
                "**Summary**: This project connects data processing, core strategy logic, and web services into a unified pipeline."
            )
            return "\n".join(lines)

        # ── Case 6: General Question ──
        lines = [
            f'Here is what the codebase implements regarding "{question}":',
            "",
        ]
        for _, itm, _ in categorized_items[:5]:
            lines.append(itm)
        lines.append("")
        lines.append(
            "Each citation above links directly to its source lines in the code viewer for detailed inspection."
        )
        return "\n".join(lines)


class FakeClient:
    """For tests and demos: needs no internet and no key."""

    def generate(self, system: str, user: str) -> str:
        return "This is a test answer. See [shop.py:1-2]."


def get_llm():
    provider = settings.llm_provider.lower()
    if provider == "gemini":
        return GeminiClient()
    if provider == "fake":
        return FakeClient()
    return OllamaClient()
