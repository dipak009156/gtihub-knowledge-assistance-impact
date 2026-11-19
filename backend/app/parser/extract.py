import ast
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ParsedSymbol:
    name: str  # 'save'
    qualified_name: str  # 'Order.save'
    kind: str  # 'function', 'method' or 'class'
    start_line: int
    end_line: int
    is_async: bool
    is_decorated: bool
    parent_qualified_name: str | None  # 'Order' for the method above


# Pattern sets for multi-language symbol extraction
CLASS_PATTERNS = [
    re.compile(
        r"^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(?:public\s+|private\s+|protected\s+)?(?:class|interface|struct|enum|trait|protocol)\s+([A-Za-z0-9_$]+)"
    ),
    re.compile(r"^\s*(?:type)\s+([A-Za-z0-9_]+)\s+(?:struct|interface)\b"),
    re.compile(r"^\s*impl(?:<[^>]+>)?\s+([A-Za-z0-9_]+)"),
    re.compile(r"^\s*(?:module)\s+([A-Za-z0-9_:]+)"),
]

METHOD_GO_RECEIVER = re.compile(
    r"^\s*func\s*\(\s*(?:\w+\s+)?\*?([A-Za-z0-9_]+)\s*\)\s*([A-Za-z0-9_]+)\s*\("
)

FUNC_PATTERNS = [
    # Go / Swift / Kotlin / Rust function: func Name(, fn Name(, fun Name(
    re.compile(
        r"^\s*(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?(?:const\s+)?(?:func|fn|fun)\s+([A-Za-z0-9_]+)\s*[`(<]"
    ),
    # JS / TS function: function name(, async function name(
    re.compile(
        r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\("
    ),
    # JS / TS arrow or assigned function: const name = () =>
    re.compile(
        r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>"
    ),
    # Ruby def name
    re.compile(r"^\s*def\s+([A-Za-z0-9_?!]+)"),
    # Java / C# / C++ method / function: public void name(
    re.compile(
        r"^\s*(?:(?:public|private|protected|static|final|native|synchronized|async|virtual|override)\s+)+[\w<>\[\], ?]+\s+([A-Za-z0-9_]+)\s*\([^;]*\)\s*(?:throws\s+[\w, ]+)?\{"
    ),
    # JS / TS class method: methodName(params) {
    re.compile(
        r"^\s*(?:(?:public|private|protected|static|async|\*)\s+)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{"
    ),
]

DISALLOWED_NAMES = {
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "finally",
    "return",
    "new",
    "super",
    "import",
    "export",
    "from",
    "const",
    "let",
    "var",
    "function",
    "class",
    "type",
    "interface",
    "struct",
    "constructor",
    "static",
    "async",
    "await",
    "sizeof",
    "typeof",
    "default",
}


def _find_brace_end(lines: list[str], start_line_idx: int) -> int:
    """Find the closing brace line for a block-scoped construct."""
    depth = 0
    found_open = False
    max_lookahead = min(start_line_idx + 250, len(lines))

    for idx in range(start_line_idx, max_lookahead):
        line = lines[idx]
        for ch in line:
            if ch == "{":
                depth += 1
                found_open = True
            elif ch == "}":
                depth -= 1
                if found_open and depth <= 0:
                    return idx + 1
    return min(start_line_idx + 40, len(lines))


def parse_multilang(text: str, filename: str = "") -> list[ParsedSymbol]:
    """Parse symbols from non-Python files (JS, TS, Go, Rust, Java, C++, etc.)."""
    lines = text.splitlines()
    if not lines:
        return []

    symbols: list[ParsedSymbol] = []
    classes: list[tuple[int, int, str]] = []  # (start_line, end_line, class_name)

    # 1. Identify Classes, Structs, Interfaces, Types
    for idx, line in enumerate(lines, 1):
        for pat in CLASS_PATTERNS:
            m = pat.search(line)
            if m:
                cname = m.group(1)
                if cname in DISALLOWED_NAMES:
                    continue
                end_line = _find_brace_end(lines, idx - 1)
                classes.append((idx, end_line, cname))

                is_dec = idx > 1 and lines[idx - 2].strip().startswith(("@", "#["))
                symbols.append(
                    ParsedSymbol(
                        name=cname,
                        qualified_name=cname,
                        kind="class",
                        start_line=idx,
                        end_line=end_line,
                        is_async=False,
                        is_decorated=is_dec,
                        parent_qualified_name=None,
                    )
                )
                break

    # 2. Identify Methods & Functions
    for idx, line in enumerate(lines, 1):
        matched_name: str | None = None
        is_receiver_method = False
        parent_class: str | None = None

        # Check Go receiver method first
        m_recv = METHOD_GO_RECEIVER.search(line)
        if m_recv:
            parent_class = m_recv.group(1)
            matched_name = m_recv.group(2)
            is_receiver_method = True

        if not matched_name:
            for pat in FUNC_PATTERNS:
                m = pat.search(line)
                if m:
                    cand = m.group(1)
                    if cand not in DISALLOWED_NAMES:
                        matched_name = cand
                        break

        if not matched_name:
            continue

        # Check if this function is inside an enclosing class
        if not parent_class:
            for c_start, c_end, cname in classes:
                if c_start < idx < c_end:
                    parent_class = cname
                    break

        kind = "method" if (parent_class or is_receiver_method) else "function"
        qname = f"{parent_class}.{matched_name}" if parent_class else matched_name
        end_line = _find_brace_end(lines, idx - 1)

        is_async = "async" in line.lower()
        is_dec = idx > 1 and lines[idx - 2].strip().startswith(("@", "#["))

        symbols.append(
            ParsedSymbol(
                name=matched_name,
                qualified_name=qname,
                kind=kind,
                start_line=idx,
                end_line=end_line,
                is_async=is_async,
                is_decorated=is_dec,
                parent_qualified_name=parent_class,
            )
        )

    # Sort symbols by line number
    symbols.sort(key=lambda s: s.start_line)
    return symbols


def parse_file(text: str, filename: str = "") -> list[ParsedSymbol]:
    """Parse symbols from source code across all programming languages."""
    if not text.strip():
        return []

    ext = Path(filename).suffix.lower() if filename else ""
    is_python = ext == ".py" or (
        not ext and ("def " in text or "class " in text or "import " in text)
    )

    if is_python:
        try:
            tree = ast.parse(text)  # raises SyntaxError on broken files
            found: list[ParsedSymbol] = []

            def visit(node, stack: list[tuple[str, str]]):
                for child in ast.iter_child_nodes(node):
                    if isinstance(
                        child,
                        (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef),
                    ):
                        is_class = isinstance(child, ast.ClassDef)
                        in_class = bool(stack) and stack[-1][1] == "class"
                        kind = (
                            "class"
                            if is_class
                            else ("method" if in_class else "function")
                        )
                        qualified = ".".join([s[0] for s in stack] + [child.name])
                        found.append(
                            ParsedSymbol(
                                name=child.name,
                                qualified_name=qualified,
                                kind=kind,
                                start_line=child.lineno,
                                end_line=child.end_lineno or child.lineno,
                                is_async=isinstance(child, ast.AsyncFunctionDef),
                                is_decorated=bool(child.decorator_list),
                                parent_qualified_name=".".join(s[0] for s in stack)
                                or None,
                            )
                        )
                        visit(child, stack + [(child.name, kind)])
                    else:
                        visit(child, stack)

            visit(tree, [])
            return found
        except SyntaxError:
            if not filename or ext == ".py":
                raise

    # Fallback / non-Python multi-language extraction
    return parse_multilang(text, filename)
