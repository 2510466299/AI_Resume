"""LLM 客户端测试，覆盖 DeepSeek 流式与 Anthropic 分支。"""
from __future__ import annotations

import json

import pytest

import backend.llm_client as llm


class _FakeStreamResponse:
    """中文注释：模拟 httpx.Client.stream 返回的 Response 对象。"""

    def __init__(self, lines: list[str], is_error: bool = False, status: int = 200, text: str = ""):
        self._lines = lines
        self.is_error = is_error
        self.status_code = status
        self._text = text or ""

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def iter_lines(self):
        for line in self._lines:
            yield line

    @property
    def text(self):
        return self._text or ""


class _FakeClient:
    """中文注释：替换 httpx.Client，上下文管理协议与 stream/post。"""

    def __init__(self, stream_resp: _FakeStreamResponse | None = None, json_resp: dict | None = None):
        self.stream_resp = stream_resp
        self.json_resp = json_resp or {"choices": [{"message": {"content": "hi", "reasoning_content": "why"}}]}
        self.post_called = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def stream(self, *_args, **_kwargs):
        return self.stream_resp

    def post(self, *_args, **_kwargs):
        class _Resp:
            status_code = 200

            def __init__(self, payload):
                self._payload = payload

            def raise_for_status(self):
                return None

            def json(self):
                return self._payload

        self.post_called = True
        return _Resp(self.json_resp)


def test_call_llm_stream_success(monkeypatch):
    # 中文注释：模拟流式返回 content 与 reasoning_content
    data1 = {"choices": [{"delta": {"content": "hello ", "reasoning_content": "why "}}]}
    data2 = {"choices": [{"delta": {"content": "world", "reasoning_content": "now"}}]}
    lines = [f"data: {json.dumps(data1)}", f"data: {json.dumps(data2)}", "data: [DONE]"]
    fake_stream = _FakeStreamResponse(lines)
    fake_client = _FakeClient(stream_resp=fake_stream)
    class _HTTPError(Exception):
        pass

    class _HTTPStatusError(_HTTPError):
        def __init__(self, response=None):
            super().__init__()
            self.response = response

    class _ResponseNotRead(Exception):
        pass

    fake_httpx = type(
        "X",
        (),
        {
            "Client": lambda *_, **__: fake_client,
            "HTTPStatusError": _HTTPStatusError,
            "HTTPError": _HTTPError,
            "ResponseNotRead": _ResponseNotRead,
        },
    )
    monkeypatch.setattr(llm, "httpx", fake_httpx)
    content, reasoning = llm.call_llm("p", include_reasoning=True, stream=True)
    assert content == "hello world"
    assert reasoning.strip() == "why now"


def test_call_llm_stream_provider_error(monkeypatch):
    # 中文注释：模拟非 200 状态触发 LLMClientError
    fake_stream = _FakeStreamResponse([], is_error=True, status=500, text="boom")
    fake_client = _FakeClient(stream_resp=fake_stream)
    class _HTTPError(Exception):
        pass

    class _HTTPStatusError(_HTTPError):
        def __init__(self, response=None):
            super().__init__()
            self.response = response

    class _ResponseNotRead(Exception):
        pass

    fake_httpx = type(
        "X",
        (),
        {
            "Client": lambda *_, **__: fake_client,
            "HTTPStatusError": _HTTPStatusError,
            "HTTPError": _HTTPError,
            "ResponseNotRead": _ResponseNotRead,
        },
    )
    monkeypatch.setattr(llm, "httpx", fake_httpx)
    with pytest.raises(llm.LLMClientError):
        llm.call_llm("p", stream=True)


def test_call_llm_anthropic(monkeypatch):
    # 中文注释：命中 anthropic 分支，提取 text block
    fake_resp = {
        "content": [
            {"type": "text", "text": "reply"},
        ]
    }

    class _AnthropicClient:
        def __init__(self, *_a, **_kw):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, *_args, **_kwargs):
            class _Resp:
                status_code = 200

                def raise_for_status(self):
                    return None

                def json(self):
                    return fake_resp

            return _Resp()

    monkeypatch.setattr(llm, "httpx", type("X", (), {"Client": lambda *_, **__: _AnthropicClient()}))
    out = llm.call_llm("p", model="claude-3", api_base="https://api.anthropic.com", stream=False)
    assert out == "reply"


def test_mask_api_key():
    # 中文注释：key 过短时仍应返回掩码
    assert llm.mask_api_key("abcd") == "ab...cd"
    assert llm.mask_api_key("a" * 12).startswith("aaaaaa")
