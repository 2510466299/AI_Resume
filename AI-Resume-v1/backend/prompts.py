"""Prompt builders supporting DB overrides and Chinese defaults."""
from __future__ import annotations

from typing import Any

from .prompt_templates import PROMPT_METADATA, PROMPT_EXAMPLES
from .storage import get_prompt_template


def _render_template(name: str, **kwargs: Any) -> str:
    template = (get_prompt_template(name) or PROMPT_METADATA[name]["template"]).strip()
    return template.format(**kwargs)


def build_parse_profile_prompt(resume_text: str, jd_text: str) -> str:
    return _render_template(
        "parse_profile",
        resume_text=resume_text,
        jd_text=jd_text,
        example=PROMPT_EXAMPLES["parse_profile"],
    )


def build_gap_analysis_prompt(resume_profile_json: str, job_profile_json: str) -> str:
    return _render_template(
        "gap_analysis",
        resume_profile_json=resume_profile_json,
        job_profile_json=job_profile_json,
        example=PROMPT_EXAMPLES["gap_analysis"],
    )


def build_learning_plan_prompt(gap_analysis_json: str) -> str:
    return _render_template(
        "learning_plan",
        gap_analysis_json=gap_analysis_json,
        example=PROMPT_EXAMPLES["learning_plan"],
    )


def build_custom_resume_prompt(resume_text: str, jd_text: str) -> str:
    return _render_template(
        "custom_resume",
        resume_text=resume_text,
        jd_text=jd_text,
    )
