import json
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from sqlmodel import Session

from .. import prompts
from ..llm_client import LLMClient
from ..pipeline import stream_analysis
from ..schemas import (
    AnalyzeRequest,
    DraftUpdateRequest,
    FullAnalysisResult,
    ResumeCustomizeRequest,
)
from ..storage import AnalysisRecord, get_session, load_analysis


router = APIRouter(tags=["analysis"])


@router.post("/analyze/stream")
async def analyze_stream_endpoint(
    request: Request, payload: AnalyzeRequest, session: Session = Depends(get_session)
) -> EventSourceResponse:
    async def event_generator() -> AsyncGenerator[dict[str, Any], None]:
        async for event in stream_analysis(payload, session):
            if await request.is_disconnected():
                break
            yield {
                "event": event.type,
                "data": json.dumps(event.dict(), ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())


@router.get("/analysis/{analysis_id}")
def get_analysis_detail(
    analysis_id: str, session: Session = Depends(get_session)
) -> dict[str, Any]:
    record = load_analysis(session, analysis_id)
    if not record or not record.result_json:
        raise HTTPException(status_code=404, detail="Analysis not found")
    result = FullAnalysisResult.parse_obj(json.loads(record.result_json))
    return {
        "id": record.id,
        "created_at": record.created_at.isoformat(),
        "result": result,
        "draft_learning_plan": json.loads(record.draft_plan_json)
        if record.draft_plan_json
        else None,
        "draft_resume": record.draft_resume,
    }


@router.post("/analysis/{analysis_id}/draft")
def save_draft(
    analysis_id: str,
    payload: DraftUpdateRequest,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    record = load_analysis(session, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if payload.learning_plan is not None:
        record.draft_plan_json = payload.learning_plan.json(ensure_ascii=False)
    if payload.custom_resume_markdown is not None:
        record.draft_resume = payload.custom_resume_markdown
    session.add(record)
    session.commit()
    return {"status": "ok"}


@router.post("/resume/customize")
async def regenerate_resume(
    payload: ResumeCustomizeRequest, session: Session = Depends(get_session)
) -> dict[str, Any]:
    customize_prompt = prompts.get_prompt_text(session, "customize")
    user_prompt = (
        f"【简历】\n{payload.resume_text}\n\n【JD】\n{payload.jd_text}\n\n"
        "输出 Markdown，突出匹配 JD 的经历。"
    )
    try:
        client = LLMClient(payload.api_key, payload.base_url, payload.model)
        markdown = await client.generate_markdown(
            system_prompt=customize_prompt, user_prompt=user_prompt
        )
    except Exception as exc:  # noqa: BLE001
        markdown = "\n".join(
            [
                "# 定制简历（fallback）",
                "LLM 未连接，返回示例。",
                f"- {exc}",
            ]
        )
    return {
        "markdown": markdown,
        "analysis_id": payload.analysis_id,
    }
