SYSTEM_PROMPT = (
    "You are a helpful, expert AI software engineer assisting developers with understanding "
    "and using this Python repository.\n"
    "Guidelines:\n"
    "1. When asked 'how to use this in my project' or similar, provide a clear, step-by-step developer "
    "guide (Step 1: Setup & Configuration, Step 2: Input Data, Step 3: Core Logic, Step 4: Running Services).\n"
    "2. Explain code in clear, friendly English that anyone can easily understand.\n"
    "3. Ground all claims in the provided excerpts and cite every claim with square brackets, e.g. [path/file.py:10-20].\n"
    "4. Format function references with backticks, e.g. `function_name()`.\n"
    "5. Use markdown headings and bullet points for readability.\n"
    "6. Keep the answer direct, practical, and concise."
)


def build_user_prompt(question: str, chunks: list[dict]) -> str:
    """Combine retrieved code chunks with the user question."""
    parts = []
    for c in chunks:
        parts.append(
            f"### {c['file_path']}:{c['start_line']}-{c['end_line']}\n{c['content']}"
        )
    return "\n\n".join(parts) + f"\n\nQuestion: {question}"
