"""LLM client abstraction for DeepSeek/OpenAI compatible APIs."""
from __future__ import annotations

import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
API_BASE_URL = os.getenv("LLM_API_BASE", "https://api.deepseek.com/chat/completions")
SYSTEM_PROMPT = (
    "You are an AI career analyst that only outputs valid JSON per instructions."
)


class LLMClientError(RuntimeError):
    """Raised when the LLM provider returns an error."""


def resolve_default_api_key() -> str | None:
    return os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY")


def _get_api_key(override: str | None = None) -> str:
    if override:
        return override
    api_key = resolve_default_api_key()
    if not api_key:
        raise LLMClientError(
            "Missing DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable."
        )
    return api_key


def call_llm(
    prompt: str,
    *,
    model: str | None = None,
    api_base: str | None = None,
    api_key: str | None = None,
    timeout: float = 60.0,
) -> str:
    """Invoke the configured LLM provider and return the raw string response."""

    headers = {
        "Authorization": f"Bearer {_get_api_key(api_key)}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": model or DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    try:
        with httpx.Client(timeout=timeout, base_url=api_base or API_BASE_URL) as client:
            response = client.post("", headers=headers, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:  # pragma: no cover - network errors
        raise LLMClientError(
            f"LLM provider error: {exc.response.status_code} {exc.response.text}"
        ) from exc
    except httpx.HTTPError as exc:  # pragma: no cover - network errors
        raise LLMClientError(f"Failed to call LLM provider: {exc}") from exc

    data = response.json()
    # DeepSeek/OpenAI compatible payloads place content under choices[].message.content
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMClientError(
            f"Unexpected LLM response format: {json.dumps(data)[:500]}"
        ) from exc
    return content.strip()


def mask_api_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) <= 10:
        return key[:2] + "..." + key[-2:]
    return f"{key[:6]}...{key[-4:]}"
