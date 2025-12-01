import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..schemas import FullAnalysisResult
from ..storage import get_session, list_history, load_analysis

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
def get_history(session: Session = Depends(get_session)) -> list[dict[str, Any]]:
    records = list_history(session, limit=50)
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "summary": (json.loads(r.result_json).get("gap_analysis", {}).get("overview", None) if r.result_json else None),
        }
        for r in records
    ]


@router.get("/{analysis_id}")
def get_history_item(
    analysis_id: str, session: Session = Depends(get_session)
) -> dict[str, Any]:
    record = load_analysis(session, analysis_id)
    if not record or not record.result_json:
        raise HTTPException(status_code=404, detail="Analysis not found")
    result = FullAnalysisResult.parse_obj(json.loads(record.result_json))
    return {
        "id": record.id,
        "created_at": record.created_at.isoformat(),
        "record": result,
        "draft_learning_plan": json.loads(record.draft_plan_json)
        if record.draft_plan_json
        else None,
        "draft_resume": record.draft_resume,
    }
