import json
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional
from uuid import uuid4

from sqlmodel import Column, Field, Session, SQLModel, create_engine, select
from sqlalchemy import Text


DB_PATH = Path(__file__).resolve().parent / "analysis.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"


class AnalysisRecord(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    resume_text: str
    jd_text: str
    result_json: Optional[str] = Field(
        default=None, sa_column=Column("result_json", Text)
    )
    logs: Optional[str] = Field(default=None, sa_column=Column("logs", Text))
    draft_plan_json: Optional[str] = Field(
        default=None, sa_column=Column("draft_plan_json", Text)
    )
    draft_resume: Optional[str] = Field(
        default=None, sa_column=Column("draft_resume", Text)
    )


class PromptRecord(SQLModel, table=True):
    key: str = Field(primary_key=True)
    content: str = Field(sa_column=Column("content", Text))
    updated_at: datetime = Field(default_factory=datetime.utcnow)


engine = create_engine(
    DATABASE_URL, echo=False, connect_args={"check_same_thread": False}
)


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterable[Session]:
    with Session(engine) as session:
        yield session


def persist_analysis(
    session: Session,
    record: AnalysisRecord,
    *,
    result: Optional[dict] = None,
    logs: Optional[list[str]] = None,
) -> AnalysisRecord:
    if result is not None:
        record.result_json = json.dumps(result, ensure_ascii=False)
    if logs:
        record.logs = json.dumps(logs, ensure_ascii=False)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def load_analysis(session: Session, analysis_id: str) -> Optional[AnalysisRecord]:
    statement = select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
    return session.exec(statement).first()


def list_history(session: Session, limit: int = 20) -> list[AnalysisRecord]:
    statement = (
        select(AnalysisRecord)
        .order_by(AnalysisRecord.created_at.desc())
        .limit(limit)
    )
    return list(session.exec(statement).all())


def upsert_prompt(session: Session, key: str, content: str) -> PromptRecord:
    record = session.get(PromptRecord, key)
    now = datetime.utcnow()
    if record:
        record.content = content
        record.updated_at = now
    else:
        record = PromptRecord(key=key, content=content, updated_at=now)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def fetch_prompt(session: Session, key: str) -> Optional[PromptRecord]:
    return session.get(PromptRecord, key)


def fetch_all_prompts(session: Session) -> list[PromptRecord]:
    statement = select(PromptRecord)
    return list(session.exec(statement).all())
