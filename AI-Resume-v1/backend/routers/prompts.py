"""Prompt management endpoints for editing templates."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..prompt_templates import PROMPT_METADATA
from ..schemas import PromptTemplateModel, PromptUpdateRequest
from ..storage import (
    StorageError,
    get_prompt_template,
    list_prompt_templates,
    update_prompt_template,
)

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptTemplateModel])
def list_prompts() -> list[PromptTemplateModel]:
    try:
        stored = {item.name: item.content for item in list_prompt_templates()}
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    results: list[PromptTemplateModel] = []
    for name, metadata in PROMPT_METADATA.items():
        results.append(
            PromptTemplateModel(
                name=name,
                content=stored.get(name, metadata["template"]),
                description=metadata["description"],
                placeholders=metadata["placeholders"],
            )
        )
    return results


@router.put("/{name}")
def update_prompt(name: str, payload: PromptUpdateRequest) -> PromptTemplateModel:
    if name not in PROMPT_METADATA:
        raise HTTPException(status_code=404, detail="Prompt not found")
    try:
        update_prompt_template(name, payload.content)
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    content = get_prompt_template(name) or PROMPT_METADATA[name]["template"]
    return PromptTemplateModel(
        name=name,
        content=content,
        description=PROMPT_METADATA[name]["description"],
        placeholders=PROMPT_METADATA[name]["placeholders"],
    )
