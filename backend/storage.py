"""SQLite persistence helpers and analysis history storage."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Field, Session, SQLModel, create_engine, select

from .schemas import FullAnalysisResult
from .prompt_templates import PROMPT_METADATA


class StorageError(RuntimeError):
    """Raised when persistence operations fail."""


DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "analysis.db"
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{os.getenv('ANALYSIS_DB_PATH', DEFAULT_DB_PATH)}"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


class AnalysisRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    analysis_id: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    resume_title: str = Field(default="")
    job_title: str = Field(default="")
    resume_text: str
    jd_text: str
    result_json: str


class PromptTemplate(SQLModel, table=True):
    name: str = Field(primary_key=True)
    content: str


class AnalysisDraft(SQLModel, table=True):
    analysis_id: str = Field(primary_key=True)
    result_json: str
    history_json: Optional[str] = None


def init_db() -> None:
    """Create tables if they do not exist."""

    SQLModel.metadata.create_all(engine)
    seed_prompt_defaults()


def _session() -> Session:
    return Session(engine)


def save_analysis(resume_text: str, jd_text: str, result: FullAnalysisResult) -> str:
    """Persist the full analysis and return its generated identifier."""

    analysis_id = str(uuid.uuid4())
    record = AnalysisRecord(
        analysis_id=analysis_id,
        resume_title=result.resume_profile.title,
        job_title=result.job_profile.title,
        resume_text=resume_text,
        jd_text=jd_text,
        result_json=result.model_dump_json(),
    )

    try:
        with _session() as session:
            session.add(record)
            session.commit()
    except SQLAlchemyError as exc:  # pragma: no cover - DB errors at runtime
        raise StorageError(f"Failed to save analysis: {exc}") from exc

    return analysis_id


def get_analysis(analysis_id: str) -> Optional[FullAnalysisResult]:
    """Load a stored analysis by identifier."""

    try:
        with _session() as session:
            statement = select(AnalysisRecord).where(
                AnalysisRecord.analysis_id == analysis_id
            )
            record = session.exec(statement).first()
    except SQLAlchemyError as exc:  # pragma: no cover - DB errors at runtime
        raise StorageError(f"Failed to fetch analysis: {exc}") from exc

    if not record:
        return None
    return FullAnalysisResult.model_validate_json(record.result_json)


def save_draft_result(analysis_id: str, result: FullAnalysisResult) -> None:
    payload = result.model_dump_json(ensure_ascii=False)
    try:
        with _session() as session:
            draft = session.get(AnalysisDraft, analysis_id)
            history: list[str] = []
            if draft and draft.result_json:
                history = json.loads(draft.history_json or "[]")
                history = [draft.result_json, *history][:10]
                draft.result_json = payload
                draft.history_json = json.dumps(history, ensure_ascii=False)
            else:
                session.add(
                    AnalysisDraft(
                        analysis_id=analysis_id,
                        result_json=payload,
                        history_json=json.dumps([], ensure_ascii=False),
                    )
                )
            session.commit()
    except SQLAlchemyError as exc:
        raise StorageError(f"Failed to save draft: {exc}") from exc


def get_draft_result(analysis_id: str) -> Optional[FullAnalysisResult]:
    try:
        with _session() as session:
            draft = session.get(AnalysisDraft, analysis_id)
            if not draft:
                return None
            return FullAnalysisResult.model_validate_json(draft.result_json)
    except SQLAlchemyError as exc:
        raise StorageError(f"Failed to fetch draft: {exc}") from exc


def clear_draft(analysis_id: str) -> None:
    try:
        with _session() as session:
            draft = session.get(AnalysisDraft, analysis_id)
            if draft:
                session.delete(draft)
                session.commit()
    except SQLAlchemyError as exc:
        raise StorageError(f"Failed to clear draft: {exc}") from exc


def seed_prompt_defaults() -> None:
    try:
        with _session() as session:
            for name, metadata in PROMPT_METADATA.items():
                existing = session.get(PromptTemplate, name)
                if not existing:
                    session.add(PromptTemplate(name=name, content=metadata["template"]))
            session.commit()
    except SQLAlchemyError as exc:  # pragma: no cover
        raise StorageError(f"Failed to seed prompts: {exc}") from exc


def get_prompt_template(name: str) -> Optional[str]:
    try:
        with _session() as session:
            template = session.get(PromptTemplate, name)
            return template.content if template else None
    except SQLAlchemyError as exc:  # pragma: no cover
        raise StorageError(f"Failed to load prompt {name}: {exc}") from exc


def update_prompt_template(name: str, content: str) -> None:
    try:
        with _session() as session:
            template = session.get(PromptTemplate, name)
            if template:
                template.content = content
            else:
                template = PromptTemplate(name=name, content=content)
                session.add(template)
            session.commit()
    except SQLAlchemyError as exc:  # pragma: no cover
        raise StorageError(f"Failed to update prompt {name}: {exc}") from exc


def list_prompt_templates() -> list[PromptTemplate]:
    try:
        with _session() as session:
            return list(session.exec(select(PromptTemplate)))
    except SQLAlchemyError as exc:  # pragma: no cover
        raise StorageError(f"Failed to list prompts: {exc}") from exc
