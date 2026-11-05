import ast
from pathlib import Path

from app.db.models import Edge, File, Repo, Symbol
from app.graph.calls import find_calls
from app.graph.queries import load_edges, load_symbols
from app.graph.service import build_graph
from app.parser.service import parse_repo


def test_find_calls():
    code = """
def my_func():
    plain_call()
    self.method_call()
    obj.attr_call()
"""
    tree = ast.parse(code)
    func_node = tree.body[0]
    calls = find_calls(func_node)

    assert ("name", "plain_call", 3) in calls
    assert ("self", "method_call", 4) in calls
    assert ("attr", "attr_call", 5) in calls


def test_graph_on_sample_folder(db_session):
    repo = Repo(
        url="https://github.com/example/sample-graph",
        owner="example",
        name="sample-graph",
        status="parsing",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    fixture_path = Path(__file__).parents[1] / "fixtures" / "sample_project"
    parse_repo(repo.id, fixture_path, session=db_session)
    build_graph(repo.id, session=db_session, repo_path=fixture_path)

    symbols = db_session.query(Symbol).filter(Symbol.repo_id == repo.id).all()
    sym_by_qname = {s.qualified_name: s for s in symbols}

    edges = db_session.query(Edge).filter(Edge.repo_id == repo.id).all()

    # checkout -> pay is certain
    checkout_sym = sym_by_qname["checkout"]
    pay_sym = sym_by_qname["pay"]
    checkout_pay_edges = [
        e for e in edges if e.caller_id == checkout_sym.id and e.callee_id == pay_sym.id
    ]
    assert len(checkout_pay_edges) == 1
    assert checkout_pay_edges[0].certainty == "certain"

    # Order.save -> Order.validate is certain
    save_sym = sym_by_qname["Order.save"]
    val_sym = sym_by_qname["Order.validate"]
    save_val_edges = [
        e for e in edges if e.caller_id == save_sym.id and e.callee_id == val_sym.id
    ]
    assert len(save_val_edges) == 1
    assert save_val_edges[0].certainty == "certain"


def test_load_symbols_and_edges(db_session):
    repo = Repo(
        url="https://github.com/example/queries-test",
        owner="example",
        name="queries-test",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    f = File(
        repo_id=repo.id,
        path="main.py",
        size_bytes=100,
        line_count=10,
        parse_error=False,
    )
    db_session.add(f)
    db_session.commit()
    db_session.refresh(f)

    s1 = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        parent_id=None,
        name="foo",
        qualified_name="foo",
        kind="function",
        start_line=1,
        end_line=5,
    )
    s2 = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        parent_id=None,
        name="bar",
        qualified_name="bar",
        kind="function",
        start_line=6,
        end_line=10,
    )
    db_session.add_all([s1, s2])
    db_session.commit()
    db_session.refresh(s1)
    db_session.refresh(s2)

    edge = Edge(
        repo_id=repo.id,
        caller_id=s1.id,
        callee_id=s2.id,
        certainty="certain",
        call_line=3,
    )
    db_session.add(edge)
    db_session.commit()

    symbols = load_symbols(db_session, repo.id)
    assert len(symbols) == 2
    assert symbols[0]["file_path"] == "main.py"
    assert "start_line" in symbols[0]
    assert "end_line" in symbols[0]

    edges = load_edges(db_session, repo.id)
    assert len(edges) == 1
    assert edges[0]["caller_id"] == s1.id
    assert edges[0]["callee_id"] == s2.id
    assert edges[0]["certainty"] == "certain"
    assert edges[0]["call_line"] == 3


def test_graph_uncertain_edge(db_session, tmp_path):
    # Test fake project with an uncertain call
    # File caller.py: def run(): x.save()
    # File target.py: def save(): pass
    repo = Repo(
        url="https://github.com/example/uncertain-test",
        owner="example",
        name="uncertain-test",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    caller_file = tmp_path / "caller.py"
    caller_file.write_text("def run():\n    x.save()\n")
    target_file = tmp_path / "target.py"
    target_file.write_text("def save():\n    pass\n")

    parse_repo(repo.id, tmp_path, session=db_session)
    build_graph(repo.id, session=db_session, repo_path=tmp_path)

    edges = db_session.query(Edge).filter(Edge.repo_id == repo.id).all()
    assert len(edges) == 1
    assert edges[0].certainty == "uncertain"
