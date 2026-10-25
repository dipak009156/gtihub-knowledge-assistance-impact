from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Computed,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

EMBEDDING_DIM = 384


class Base(DeclarativeBase):
    pass


class Repo(Base):
    __tablename__ = "repos"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(500), unique=True)
    owner: Mapped[str] = mapped_column(String(200))
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(
        String(20), default="queued"
    )  # queued, cloning, ready, error
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class File(Base):
    __tablename__ = "files"
    __table_args__ = (UniqueConstraint("repo_id", "path"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repos.id", ondelete="CASCADE"), index=True
    )
    path: Mapped[str] = mapped_column(String(1000))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    line_count: Mapped[int] = mapped_column(Integer, default=0)
    parse_error: Mapped[bool] = mapped_column(Boolean, default=False)


class Symbol(Base):
    __tablename__ = "symbols"

    id: Mapped[int] = mapped_column(primary_key=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repos.id", ondelete="CASCADE"), index=True
    )
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), index=True
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("symbols.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(300), index=True)
    qualified_name: Mapped[str] = mapped_column(String(600))
    kind: Mapped[str] = mapped_column(String(20))  # function, method, class
    start_line: Mapped[int] = mapped_column(Integer)
    end_line: Mapped[int] = mapped_column(Integer)
    is_async: Mapped[bool] = mapped_column(Boolean, default=False)
    is_decorated: Mapped[bool] = mapped_column(Boolean, default=False)


class Edge(Base):
    __tablename__ = "edges"
    __table_args__ = (UniqueConstraint("caller_id", "callee_id", "call_line"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repos.id", ondelete="CASCADE"), index=True
    )
    caller_id: Mapped[int] = mapped_column(
        ForeignKey("symbols.id", ondelete="CASCADE"), index=True
    )
    callee_id: Mapped[int] = mapped_column(
        ForeignKey("symbols.id", ondelete="CASCADE"), index=True
    )
    certainty: Mapped[str] = mapped_column(String(10))  # certain, uncertain
    call_line: Mapped[int] = mapped_column(Integer)


class Chunk(Base):
    __tablename__ = "chunks"
    __table_args__ = (
        Index("ix_chunks_tsv", "tsv", postgresql_using="gin"),
        Index(
            "ix_chunks_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repos.id", ondelete="CASCADE"), index=True
    )
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), index=True
    )
    symbol_id: Mapped[int | None] = mapped_column(
        ForeignKey("symbols.id", ondelete="SET NULL")
    )
    start_line: Mapped[int] = mapped_column(Integer)
    end_line: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))
    tsv = mapped_column(
        TSVECTOR, Computed("to_tsvector('english', content)", persisted=True)
    )


class Commit(Base):
    __tablename__ = "commits"
    __table_args__ = (UniqueConstraint("repo_id", "sha"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repos.id", ondelete="CASCADE"), index=True
    )
    sha: Mapped[str] = mapped_column(String(40))
    author: Mapped[str | None] = mapped_column(String(300))
    committed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    message: Mapped[str | None] = mapped_column(Text)
    files_changed: Mapped[int] = mapped_column(Integer, default=0)
    is_bulk: Mapped[bool] = mapped_column(Boolean, default=False)  # over about 30 files


class CommitFile(Base):
    __tablename__ = "commit_files"

    commit_id: Mapped[int] = mapped_column(
        ForeignKey("commits.id", ondelete="CASCADE"), primary_key=True
    )
    path: Mapped[str] = mapped_column(String(1000), primary_key=True)


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    repo_id: Mapped[int] = mapped_column(
        ForeignKey("repos.id", ondelete="CASCADE"), index=True
    )
    variant: Mapped[str] = mapped_column(String(20))  # graph, history, combined
    k: Mapped[int] = mapped_column(Integer)  # 5 or 10
    commits_tested: Mapped[int] = mapped_column(Integer)
    precision: Mapped[float] = mapped_column(Float)
    recall: Mapped[float] = mapped_column(Float)
    details: Mapped[dict | None] = mapped_column(
        JSONB
    )  # predicted vs real files per commit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
