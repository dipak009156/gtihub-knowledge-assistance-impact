SYSTEM_PROMPT = (
    "You answer questions about one Python project, using ONLY the code"
    " excerpts you are given. "
    "Cite every claim with the exact source in square brackets, in this style:"
    " [path/to/file.py:10-20]. "
    "Use only the file paths and line numbers printed on the excerpts. "
    "If the excerpts do not contain the answer, say you could not find it in"
    " this project. "
    "Never invent files, functions or line numbers. Keep the answer short and"
    " clear."
)


def build_user_prompt(question: str, chunks: list[dict]) -> str:
    """Combine retrieved code chunks with the user question."""
    parts = []
    for c in chunks:
        parts.append(
            f"### {c['file_path']}:{c['start_line']}-{c['end_line']}\n{c['content']}"
        )
    return "\n\n".join(parts) + f"\n\nQuestion: {question}"
