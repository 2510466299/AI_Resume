"""LLM client abstraction for DeepSeek/OpenAI compatible APIs."""
from __future__ import annotations

import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
API_BASE_URL = os.getenv("LLM_API_BASE", "https://api.deepseek.com")
ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
DEFAULT_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "60"))
CHAT_COMPLETIONS_PATH = "/chat/completions"
ANTHROPIC_MESSAGES_PATH = "/v1/messages"

SYSTEM_PROMPT = (
    "You are an AI career analyst that only outputs valid JSON per instructions."
)


class LLMClientError(RuntimeError):
    """Raised when the LLM provider returns an error."""


def resolve_default_api_key(provider: str = "deepseek") -> str | None:
    if provider == "anthropic":
        return os.getenv("ANTHROPIC_AUTH_TOKEN")
    return os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY")


def _get_api_key(override: str | None = None, provider: str = "deepseek") -> str:
    if override:
        return override
    api_key = resolve_default_api_key(provider)
    if not api_key:
        raise LLMClientError(
            "Missing API key. Set DEEPSEEK_API_KEY/OPENAI_API_KEY or ANTHROPIC_AUTH_TOKEN."
        )
    return api_key


def call_llm(
    prompt: str,
    *,
    model: str | None = None,
    api_base: str | None = None,
    api_key: str | None = None,
    timeout: float | None = None,
    include_reasoning: bool = False,
    stream: bool = True,
) -> str | tuple[str, str | None]:
    """Invoke the configured LLM provider and return the raw string response.

    For DeepSeek reasoning models (e.g., deepseek-reasoner) set include_reasoning=True
    to also capture the reasoning_content from the response.
    """

    effective_timeout = timeout or DEFAULT_TIMEOUT
    target_model = model or DEFAULT_MODEL
    base_url = api_base or API_BASE_URL

    lower_base = base_url.lower()
    provider = (
        "anthropic"
        if "anthropic" in lower_base or "jiuwan" in lower_base or "claude" in target_model.lower()
        else "deepseek"
    )
    if provider == "anthropic":
        return _call_anthropic(
            prompt,
            model=target_model,
            api_base=api_base or ANTHROPIC_BASE_URL,
            api_key=_get_api_key(api_key, provider="anthropic"),
            timeout=effective_timeout,
            stream=stream,
        )

    headers = {
        "Authorization": f"Bearer {_get_api_key(api_key)}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }
    # DeepSeek reasoning模型不支持 temperature 等参数，避免发送无效字段
    if target_model == "deepseek-reasoner":
        payload.pop("temperature", None)
    if stream:
        payload["stream"] = True

    try:
        with httpx.Client(
            timeout=effective_timeout, base_url=api_base or API_BASE_URL
        ) as client:
            path = ""
            base = api_base or API_BASE_URL
            if not base.rstrip("/").endswith("chat/completions"):
                path = CHAT_COMPLETIONS_PATH
            if stream:
                content_parts: list[str] = []
                reasoning_parts: list[str] = []
                with client.stream("POST", path, headers=headers, json=payload) as response:
                    if response.is_error:
                        try:
                            detail = response.text
                        except httpx.ResponseNotRead:
                            try:
                                detail = response.read().decode("utf-8")
                            except Exception:
                                detail = "<stream response not available>"
                        raise LLMClientError(
                            f"LLM provider error: {response.status_code} {detail}"
                        )
                    for line in response.iter_lines():
                        if not line:
                            continue
                        if isinstance(line, bytes):
                            line = line.decode("utf-8", errors="ignore")
                        if line.startswith("data:"):
                            data_line = line[len("data:"):].strip()
                        else:
                            continue
                        if data_line == "[DONE]":
                            break
                        try:
                            data = json.loads(data_line)
                        except json.JSONDecodeError:
                            continue
                        choices = data.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta") or {}
                        if delta.get("content"):
                            content_parts.append(delta["content"])
                        if include_reasoning and delta.get("reasoning_content"):
                            reasoning_parts.append(delta["reasoning_content"])
                content = "".join(content_parts).strip()
                reasoning = "".join(reasoning_parts).strip() if reasoning_parts else None
                return (content, reasoning) if include_reasoning else content
            else:
                response = client.post(path, headers=headers, json=payload)
                response.raise_for_status()
    except httpx.HTTPStatusError as exc:  # pragma: no cover - network errors
        detail = ""
        try:
            detail = exc.response.text
        except httpx.ResponseNotRead:
            try:
                detail = exc.response.read().decode("utf-8")
            except Exception:
                detail = "<stream response not available>"
        raise LLMClientError(
            f"LLM provider error: {exc.response.status_code} {detail}"
        ) from exc
    except httpx.HTTPError as exc:  # pragma: no cover - network errors
        raise LLMClientError(f"Failed to call LLM provider: {exc}") from exc

    data = response.json()
    # DeepSeek/OpenAI compatible payloads place content under choices[].message.content
    try:
        message = data["choices"][0]["message"]
        content = message["content"]
        reasoning = message.get("reasoning_content")
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMClientError(
            f"Unexpected LLM response format: {json.dumps(data)[:500]}"
        ) from exc
    if include_reasoning:
        return content.strip(), (reasoning.strip() if isinstance(reasoning, str) else None)
    return content.strip()


def mask_api_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) <= 10:
        return key[:2] + "..." + key[-2:]
    return f"{key[:6]}...{key[-4:]}"


def _call_anthropic(
    prompt: str,
    *,
    model: str,
    api_base: str,
    api_key: str,
    timeout: float,
    stream: bool,
) -> str:
    """Anthropic Messages API call (non-stream for simplicity)."""

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2048,
        "stream": False,  # we aggregate sync to simplify handling
    }

    try:
        with httpx.Client(timeout=timeout, base_url=api_base) as client:
            path = ANTHROPIC_MESSAGES_PATH if api_base.endswith("/v1") else ANTHROPIC_MESSAGES_PATH
            response = client.post(path, headers=headers, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = ""
        try:
            detail = exc.response.text
        except httpx.ResponseNotRead:
            try:
                detail = exc.response.read().decode("utf-8")
            except Exception:
                detail = "<stream response not available>"
        raise LLMClientError(
            f"LLM provider error: {exc.response.status_code} {detail}"
        ) from exc
    except httpx.HTTPError as exc:
        raise LLMClientError(f"Failed to call LLM provider: {exc}") from exc

    data = response.json()
    try:
        contents = data["content"]
        if not contents:
            raise KeyError("content empty")
        # Anthropic returns list of blocks; pick first text block
        for block in contents:
            if isinstance(block, dict) and block.get("type") == "text":
                return str(block.get("text", "")).strip()
        raise KeyError("No text block in content")
    except (KeyError, TypeError) as exc:
        raise LLMClientError(
            f"Unexpected Anthropic response format: {json.dumps(data)[:500]}"
        ) from exc
