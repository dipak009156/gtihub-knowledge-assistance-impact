import ast


def find_calls(func_node: ast.AST) -> list[tuple[str, str, int]]:
    """Find calls inside an AST function node.

    Returns a list of tuples: (call_type, target_name, line_number)
    call_type is 'name', 'self', or 'attr'.
    """
    calls: list[tuple[str, str, int]] = []
    for node in ast.walk(func_node):
        if not isinstance(node, ast.Call):
            continue
        f = node.func
        if isinstance(f, ast.Name):
            calls.append(("name", f.id, node.lineno))
        elif isinstance(f, ast.Attribute):
            if isinstance(f.value, ast.Name) and f.value.id == "self":
                calls.append(("self", f.attr, node.lineno))
            else:
                calls.append(("attr", f.attr, node.lineno))
    return calls
