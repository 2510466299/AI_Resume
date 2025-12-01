from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..prompts import DEFAULT_PROMPTS, get_prompt_text, set_prompt_text
from ..schemas import PromptPayload
from ..storage import fetch_all_prompts, get_session


router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("")
def list_prompts(session: Session = Depends(get_session)) -> Dict[str, str]:
    records = fetch_all_prompts(session)
    merged: Dict[str, str] = DEFAULT_PROMPTS.copy()
    for r in records:
        merged[r.key] = r.content
    return merged


@router.post("")
def update_prompt(
    payload: PromptPayload, session: Session = Depends(get_session)
) -> Dict[str, Any]:
    set_prompt_text(session, payload.key, payload.content)
    return {
        "key": payload.key,
        "content": get_prompt_text(session, payload.key),
    }
