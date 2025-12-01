"""LLM-first analysis pipeline shared by demo and FastAPI."""
from __future__ import annotations

import json
from typing import Dict, Optional, Tuple

from . import prompts
from .llm_client import LLMClientError, call_llm
from .schemas import (
    FullAnalysisResult,
    GapAnalysisResult,
    JDMappingMatrix,
    LearningPlan,
    Profile,
)

# Tokens used when the LLM needs stubs for single profile requests.
_RESUME_PLACEHOLDER = """
This resume section is intentionally blank for a job-only request.
Return a resume_profile stub with empty arrays, title "", and years_experience 0.
"""

_JOB_PLACEHOLDER = """
This job description is intentionally blank for a resume-only request.
Return a job_profile stub with empty arrays, title "", and years_experience 0.
"""


class PipelineError(RuntimeError):
    """Raised when LLM output cannot be parsed into expected schemas."""


def _strip_code_fence(payload: str) -> str:
    text = payload.strip()
    if text.startswith("```"):
        # remove ```json or ``` fence prefix
        text = text[3:]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def _loads(payload: str) -> dict:
    clean = _strip_code_fence(payload)
    try:
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        raise PipelineError(f"Failed to parse LLM JSON: {exc}: {payload[:500]}") from exc


def _normalize_coverage_value(value: object) -> str:
    if not isinstance(value, str):
        return "none"
    token = value.strip().lower()
    synonyms = {
        "strong": "full",
        "excellent": "full",
        "good": "partial",
        "medium": "partial",
        "moderate": "partial",
        "weak": "partial",
        "limited": "partial",
        "minimal": "none",
        "poor": "none",
        "missing": "none",
        "none": "none",
    }
    if token in synonyms:
        return synonyms[token]
    if "full" in token:
        return "full"
    if "partial" in token:
        return "partial"
    return "none"


def _normalize_resume_mappings(matrix_payload: dict) -> None:
    mappings = matrix_payload.get("resume_mapping")
    if not isinstance(mappings, list):
        return
    for item in mappings:
        if isinstance(item, dict):
            item["coverage"] = _normalize_coverage_value(item.get("coverage"))


LLMConfig = Dict[str, Optional[str]]


def _call_with_config(
    prompt: str,
    llm_config: Optional[LLMConfig],
    *,
    include_reasoning: bool = False,
) -> str | tuple[str, str | None]:
    cfg = llm_config or {}
    return call_llm(
        prompt,
        model=cfg.get("model"),
        api_base=cfg.get("api_base"),
        api_key=cfg.get("api_key"),
        stream=True,
        include_reasoning=include_reasoning,
    )


def parse_resume_and_job(
    resume_text: str,
    jd_text: str,
    *,
    llm_config: Optional[LLMConfig] = None,
    return_raw: bool = False,
) -> Tuple[Profile, Profile, Optional[str], Optional[str]]:
    prompt = prompts.build_parse_profile_prompt(resume_text, jd_text)
    raw_response = _call_with_config(
        prompt, llm_config, include_reasoning=return_raw
    )
    reasoning = None
    raw = raw_response
    if isinstance(raw_response, tuple):
        raw, reasoning = raw_response
    data = _loads(raw)
    try:
        resume_profile = Profile.model_validate(data["resume_profile"])
        job_profile = Profile.model_validate(data["job_profile"])
    except KeyError as exc:
        raise PipelineError("Missing profile keys in LLM response") from exc
    return (resume_profile, job_profile, raw, reasoning) if return_raw else (resume_profile, job_profile, None, None)


def parse_resume_only(resume_text: str, *, llm_config: Optional[LLMConfig] = None) -> Profile:
    resume_profile, _, _, _ = parse_resume_and_job(
        resume_text, _JOB_PLACEHOLDER, llm_config=llm_config
    )
    return resume_profile


def parse_job_only(jd_text: str, *, llm_config: Optional[LLMConfig] = None) -> Profile:
    _, job_profile, _, _ = parse_resume_and_job(
        _RESUME_PLACEHOLDER, jd_text, llm_config=llm_config
    )
    return job_profile


def analyze_gaps_and_mapping(
    resume_profile: Profile,
    job_profile: Profile,
    *,
    llm_config: Optional[LLMConfig] = None,
    return_raw: bool = False,
) -> Tuple[GapAnalysisResult, JDMappingMatrix, Optional[str], Optional[str]]:
    resume_json = json.dumps(resume_profile.model_dump(), ensure_ascii=False)
    job_json = json.dumps(job_profile.model_dump(), ensure_ascii=False)
    prompt = prompts.build_gap_analysis_prompt(resume_json, job_json)
    raw_response = _call_with_config(
        prompt, llm_config, include_reasoning=return_raw
    )
    reasoning = None
    raw = raw_response
    if isinstance(raw_response, tuple):
        raw, reasoning = raw_response
    data = _loads(raw)
    matrix_payload = data.get("jd_mapping_matrix")
    if isinstance(matrix_payload, dict):
        _normalize_resume_mappings(matrix_payload)
    try:
        gap_analysis = GapAnalysisResult.model_validate(data["gap_analysis"])
        jd_mapping_matrix = JDMappingMatrix.model_validate(data["jd_mapping_matrix"])
    except KeyError as exc:
        raise PipelineError("Missing gap or mapping keys in LLM response") from exc
    return (
        gap_analysis,
        jd_mapping_matrix,
        raw if return_raw else None,
        reasoning if return_raw else None,
    )


def generate_learning_plan(
    gap_analysis: GapAnalysisResult,
    *,
    llm_config: Optional[LLMConfig] = None,
    return_raw: bool = False,
) -> Tuple[LearningPlan, Optional[str], Optional[str]]:
    gap_json = json.dumps(gap_analysis.model_dump(), ensure_ascii=False)
    prompt = prompts.build_learning_plan_prompt(gap_json)
    raw_response = _call_with_config(
        prompt, llm_config, include_reasoning=return_raw
    )
    reasoning = None
    raw = raw_response
    if isinstance(raw_response, tuple):
        raw, reasoning = raw_response
    data = _loads(raw)
    try:
        plan = LearningPlan.model_validate(data["learning_plan"])
    except KeyError as exc:
        raise PipelineError("Missing learning_plan key in LLM response") from exc
    return plan, raw if return_raw else None, reasoning if return_raw else None


def generate_custom_resume(
    resume_text: str,
    jd_text: str,
    *,
    llm_config: Optional[LLMConfig] = None,
    return_raw: bool = False,
) -> Tuple[str, Optional[str], Optional[str]]:
    prompt = prompts.build_custom_resume_prompt(resume_text, jd_text)
    raw_response = _call_with_config(
        prompt, llm_config, include_reasoning=return_raw
    )
    reasoning = None
    raw = raw_response
    if isinstance(raw_response, tuple):
        raw, reasoning = raw_response
    data = _loads(raw)
    try:
        custom_md = data["custom_resume_markdown"]
    except KeyError as exc:
        raise PipelineError("Missing custom_resume_markdown in LLM response") from exc
    if not isinstance(custom_md, str):
        raise PipelineError("custom_resume_markdown must be a string")
    return custom_md, raw if return_raw else None, reasoning if return_raw else None


def run_full_analysis(
    resume_text: str,
    jd_text: str,
    *,
    llm_config: Optional[LLMConfig] = None,
) -> FullAnalysisResult:
    resume_profile, job_profile, _, _ = parse_resume_and_job(
        resume_text, jd_text, llm_config=llm_config
    )
    gap_analysis, jd_mapping, _, _ = analyze_gaps_and_mapping(
        resume_profile, job_profile, llm_config=llm_config
    )
    learning_plan, _, _ = generate_learning_plan(
        gap_analysis, llm_config=llm_config
    )
    custom_resume_markdown, _, _ = generate_custom_resume(
        resume_text, jd_text, llm_config=llm_config
    )
    return FullAnalysisResult(
        resume_profile=resume_profile,
        job_profile=job_profile,
        gap_analysis=gap_analysis,
        jd_mapping_matrix=jd_mapping,
        learning_plan=learning_plan,
        custom_resume_markdown=custom_resume_markdown,
    )
