import ast
from dataclasses import dataclass


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


def parse_file(text: str) -> list[ParsedSymbol]:
    tree = ast.parse(text)  # raises SyntaxError on broken files
    found: list[ParsedSymbol] = []

    def visit(node, stack: list[tuple[str, str]]):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                is_class = isinstance(child, ast.ClassDef)
                in_class = bool(stack) and stack[-1][1] == "class"
                kind = "class" if is_class else ("method" if in_class else "function")
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
                        parent_qualified_name=".".join(s[0] for s in stack) or None,
                    )
                )
                visit(child, stack + [(child.name, kind)])
            else:
                visit(child, stack)

    visit(tree, [])
    return found
