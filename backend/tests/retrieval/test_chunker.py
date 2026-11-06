from app.retrieval.chunker import chunk_file, windows


def test_windows_helper():
    assert list(windows(1, 100)) == [(1, 60), (51, 100)]
    assert list(windows(1, 60)) == [(1, 60)]


def test_5_line_function():
    code = "def short():\n    x = 1\n    y = 2\n    z = 3\n    return x + y + z"
    symbols = [
        {
            "id": 1,
            "kind": "function",
            "start_line": 1,
            "end_line": 5,
            "parent_id": None,
        }
    ]
    chunks = chunk_file(code, symbols)
    assert len(chunks) == 1
    assert chunks[0]["symbol_id"] == 1
    assert chunks[0]["start_line"] == 1
    assert chunks[0]["end_line"] == 5


def test_150_line_function():
    # 150 lines: def long_fn(): followed by 149 lines
    lines = ["def long_fn():"] + [f"    x_{i} = {i}" for i in range(1, 150)]
    code = "\n".join(lines)
    symbols = [
        {
            "id": 2,
            "kind": "function",
            "start_line": 1,
            "end_line": 150,
            "parent_id": None,
        }
    ]
    chunks = chunk_file(code, symbols)
    assert len(chunks) == 3
    for c in chunks:
        assert c["symbol_id"] == 2
    # Windows: (1, 60), (51, 110), (101, 150)
    assert chunks[0]["start_line"] == 1
    assert chunks[0]["end_line"] == 60
    assert chunks[1]["start_line"] == 51
    assert chunks[1]["end_line"] == 110
    assert chunks[2]["start_line"] == 101
    assert chunks[2]["end_line"] == 150


def test_class_with_2_methods():
    code = (
        "class MyClass:\n"
        '    """Docstring for class."""\n'
        "    x = 1\n"
        "\n"
        "    def m1(self):\n"
        "        pass\n"
        "\n"
        "    def m2(self):\n"
        "        pass"
    )
    # class: lines 1-8, m1: 5-6, m2: 8-8
    symbols = [
        {
            "id": 10,
            "kind": "class",
            "start_line": 1,
            "end_line": 8,
            "parent_id": None,
        },
        {
            "id": 11,
            "kind": "method",
            "start_line": 5,
            "end_line": 6,
            "parent_id": 10,
        },
        {
            "id": 12,
            "kind": "method",
            "start_line": 8,
            "end_line": 8,
            "parent_id": 10,
        },
    ]
    chunks = chunk_file(code, symbols)
    # class-top: lines 1-4 (before first method line 5)
    # m1: lines 5-6
    # m2: lines 8-8
    symbol_ids = [c["symbol_id"] for c in chunks]
    assert 10 in symbol_ids
    assert 11 in symbol_ids
    assert 12 in symbol_ids
    class_top = next(c for c in chunks if c["symbol_id"] == 10)
    assert class_top["start_line"] == 1
    assert class_top["end_line"] == 4


def test_lines_outside_any_symbol():
    code = "import os\nimport sys\n\nCONST = 42\n"
    chunks = chunk_file(code, [])
    assert len(chunks) == 1
    assert chunks[0]["symbol_id"] is None
    assert "import os" in chunks[0]["content"]


def test_file_with_only_blank_lines():
    code = "   \n\n\t  \n\n"
    chunks = chunk_file(code, [])
    assert chunks == []


def test_file_with_syntax_error():
    code = "def (\nsome broken code\n"
    # No symbols when parse_error
    chunks = chunk_file(code, [])
    assert len(chunks) == 1
    assert chunks[0]["symbol_id"] is None
