import json
import os
from typing import Optional, Type, TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel


T = TypeVar("T", bound=BaseModel)


class LLMClient:
    """
    Thin wrapper for OpenAI-compatible chat completions (e.g., DeepSeek V3).
    Supports structured JSON responses using `response_format={"type": "json_object"}`.
    """

    def __init__(self, api_key: Optional[str], base_url: Optional[str], model: str):
        key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not key:
            raise ValueError("Missing API key for LLM (set DEEPSEEK_API_KEY or pass api_key)")
        url = base_url or os.getenv("DEEPSEEK_BASE_URL")
        self.client = AsyncOpenAI(api_key=key, base_url=url)
        self.model = model

    async def generate_json(
        self, *, system_prompt: str, user_prompt: str, response_model: Type[T]
    ) -> T:
        completion = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content or "{}"
        data = json.loads(content)
        return response_model.parse_obj(data)

    async def generate_markdown(self, *, system_prompt: str, user_prompt: str) -> str:
        completion = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return completion.choices[0].message.content or ""
