"""Analyze router exposing the main LLM-driven pipeline."""
from __future__ import annotations

import json
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..llm_client import (
    LLMClientError,
    DEFAULT_MODEL,
    API_BASE_URL,
    resolve_default_api_key,
    mask_api_key,
)
from ..pipeline import (
    PipelineError,
    analyze_gaps_and_mapping,
    generate_custom_resume,
    generate_learning_plan,
    parse_job_only,
    parse_resume_and_job,
    parse_resume_only,
    run_full_analysis,
)
from ..schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CustomResumeRequest,
    CustomResumeResponse,
    FullAnalysisResult,
    JobOnlyRequest,
    DraftUpdateRequest,
    ProfileResponse,
    ResumeOnlyRequest,
)
from ..storage import (
    StorageError,
    get_analysis,
    get_draft_result,
    save_analysis,
    save_draft_result,
)

router = APIRouter(tags=["analyze"])


def _llm_config_from_payload(payload: AnalyzeRequest) -> dict[str, Optional[str]]:
    return {
        "api_key": getattr(payload, "llm_api_key", None),
        "api_base": getattr(payload, "llm_api_base", None),
        "model": getattr(payload, "llm_model", None),
    }


def _format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_endpoint(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Run the full analysis pipeline over the provided resume/JD text."""

    llm_config = _llm_config_from_payload(payload)

    try:
        result = run_full_analysis(
            payload.resume_text, payload.jd_text, llm_config=llm_config
        )
    except (LLMClientError, PipelineError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    analysis_id = None
    try:
        analysis_id = save_analysis(payload.resume_text, payload.jd_text, result)
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalyzeResponse(analysis_id=analysis_id, result=result)


@router.post("/resume/only", response_model=ProfileResponse)
def resume_only_endpoint(payload: ResumeOnlyRequest) -> ProfileResponse:
    try:
        profile = parse_resume_only(
            payload.resume_text,
            llm_config={
                "api_key": payload.llm_api_key,
                "api_base": payload.llm_api_base,
                "model": payload.llm_model,
            },
        )
    except (LLMClientError, PipelineError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProfileResponse(profile=profile)


@router.post("/job/only", response_model=ProfileResponse)
def job_only_endpoint(payload: JobOnlyRequest) -> ProfileResponse:
    try:
        profile = parse_job_only(
            payload.jd_text,
            llm_config={
                "api_key": payload.llm_api_key,
                "api_base": payload.llm_api_base,
                "model": payload.llm_model,
            },
        )
    except (LLMClientError, PipelineError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProfileResponse(profile=profile)


@router.post("/resume/customize", response_model=CustomResumeResponse)
def customize_resume_endpoint(payload: CustomResumeRequest) -> CustomResumeResponse:
    try:
        markdown, _ = generate_custom_resume(
            payload.resume_text,
            payload.jd_text,
            llm_config={
                "api_key": payload.llm_api_key,
                "api_base": payload.llm_api_base,
                "model": payload.llm_model,
            },
            return_raw=True,
        )
    except (LLMClientError, PipelineError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CustomResumeResponse(custom_resume_markdown=markdown)


@router.get("/history/{analysis_id}", response_model=AnalyzeResponse)
def history_detail_endpoint(analysis_id: str) -> AnalyzeResponse:
    try:
        record = get_analysis(analysis_id)
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if record is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    draft = None
    try:
        draft = get_draft_result(analysis_id)
    except StorageError:
        draft = None

    return AnalyzeResponse(analysis_id=analysis_id, result=record, draft_result=draft)


@router.get("/analysis/{analysis_id}/draft", response_model=AnalyzeResponse)
def get_draft_endpoint(analysis_id: str) -> AnalyzeResponse:
    try:
        draft = get_draft_result(analysis_id)
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    return AnalyzeResponse(analysis_id=analysis_id, result=draft)


@router.put("/analysis/{analysis_id}/draft", response_model=AnalyzeResponse)
def update_draft_endpoint(analysis_id: str, payload: DraftUpdateRequest) -> AnalyzeResponse:
    try:
        base = get_analysis(analysis_id)
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if base is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    try:
        save_draft_result(analysis_id, payload.result)
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalyzeResponse(analysis_id=analysis_id, result=base, draft_result=payload.result)


@router.post("/analyze/stream")
def analyze_stream_endpoint(payload: AnalyzeRequest) -> StreamingResponse:
    llm_config = _llm_config_from_payload(payload)
    run_id = payload.client_run_id or str(uuid4())
    reasoning_mode = (llm_config.get("model") or DEFAULT_MODEL) == "deepseek-reasoner"

    def event_iterator():
        yield _format_sse(
            "run",
            {"run_id": run_id, "status": "started"},
        )
        try:
            resume_profile, job_profile, raw_parse, reasoning_parse = parse_resume_and_job(
                payload.resume_text,
                payload.jd_text,
                llm_config=llm_config,
                return_raw=True,
            )
            if raw_parse:
                yield _format_sse(
                    "llm_output",
                    {"run_id": run_id, "stage": "parse_profile", "content": raw_parse},
                )
            if reasoning_mode and reasoning_parse:
                yield _format_sse(
                    "reasoning_output",
                    {"run_id": run_id, "stage": "parse_profile", "content": reasoning_parse},
                )
            gap_analysis, jd_mapping, raw_gap, reasoning_gap = analyze_gaps_and_mapping(
                resume_profile,
                job_profile,
                llm_config=llm_config,
                return_raw=True,
            )
            if raw_gap:
                yield _format_sse(
                    "llm_output",
                    {"run_id": run_id, "stage": "gap_analysis", "content": raw_gap},
                )
            if reasoning_mode and reasoning_gap:
                yield _format_sse(
                    "reasoning_output",
                    {"run_id": run_id, "stage": "gap_analysis", "content": reasoning_gap},
                )
            learning_plan, raw_plan, reasoning_plan = generate_learning_plan(
                gap_analysis,
                llm_config=llm_config,
                return_raw=True,
            )
            if raw_plan:
                yield _format_sse(
                    "llm_output",
                    {"run_id": run_id, "stage": "learning_plan", "content": raw_plan},
                )
            if reasoning_mode and reasoning_plan:
                yield _format_sse(
                    "reasoning_output",
                    {"run_id": run_id, "stage": "learning_plan", "content": reasoning_plan},
                )
            custom_resume_markdown, raw_resume, reasoning_resume = generate_custom_resume(
                payload.resume_text,
                payload.jd_text,
                llm_config=llm_config,
                return_raw=True,
            )
            if raw_resume:
                yield _format_sse(
                    "llm_output",
                    {"run_id": run_id, "stage": "custom_resume", "content": raw_resume},
                )
            if reasoning_mode and reasoning_resume:
                yield _format_sse(
                    "reasoning_output",
                    {"run_id": run_id, "stage": "custom_resume", "content": reasoning_resume},
                )

            result = FullAnalysisResult(
                resume_profile=resume_profile,
                job_profile=job_profile,
                gap_analysis=gap_analysis,
                jd_mapping_matrix=jd_mapping,
                learning_plan=learning_plan,
                custom_resume_markdown=custom_resume_markdown,
            )
            analysis_id = None
            try:
                analysis_id = save_analysis(
                    payload.resume_text, payload.jd_text, result
                )
            except StorageError as exc:  # pragma: no cover
                yield _format_sse(
                    "error",
                    {"run_id": run_id, "message": str(exc)},
                )
                return

            yield _format_sse(
                "result",
                {
                    "run_id": run_id,
                    "analysis_id": analysis_id,
                    "result": result.model_dump(),
                },
            )
            yield _format_sse(
                "complete",
                {"run_id": run_id, "analysis_id": analysis_id},
            )
        except (LLMClientError, PipelineError) as exc:
            yield _format_sse(
                "error",
                {"run_id": run_id, "message": str(exc)},
            )

    return StreamingResponse(event_iterator(), media_type="text/event-stream")


@router.get("/llm/config")
def llm_config_endpoint() -> dict[str, object]:
    key = resolve_default_api_key()
    masked = mask_api_key(key)
    return {
        "default_model": DEFAULT_MODEL,
        "default_api_base": API_BASE_URL,
        "has_default_key": bool(key),
        "masked_key": masked,
    }
