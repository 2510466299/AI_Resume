"""FastAPI 路由层测试，覆盖正常与异常路径。"""
from __future__ import annotations

import json

import pytest
from fastapi import HTTPException


def test_health_ok(temp_app):
    # 中文注释：健康检查应返回 200 与固定 payload
    _analyze, client = temp_app
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_analyze_success(monkeypatch, temp_app, fake_result_factory):
    analyze, client = temp_app

    # 中文注释：mock 全量分析与存储成功路径
    monkeypatch.setattr(analyze, "run_full_analysis", lambda *_, **__: fake_result_factory())
    monkeypatch.setattr(analyze, "save_analysis", lambda *_, **__: "aid-123")

    resp = client.post("/analyze", json={"resume_text": "r", "jd_text": "j"})
    data = resp.json()
    assert resp.status_code == 200
    assert data["analysis_id"] == "aid-123"
    assert data["result"]["custom_resume_markdown"] == "md"


def test_analyze_pipeline_error(monkeypatch, temp_app):
    analyze, client = temp_app

    # 中文注释：当流水线抛异常时应返回 400
    def _boom(*_, **__):
        raise analyze.PipelineError("bad parse")

    monkeypatch.setattr(analyze, "run_full_analysis", _boom)

    resp = client.post("/analyze", json={"resume_text": "r", "jd_text": "j"})
    assert resp.status_code == 400
    assert "bad parse" in resp.json()["detail"]


def test_resume_only_success(monkeypatch, temp_app, fake_result_factory):
    analyze, client = temp_app
    monkeypatch.setattr(analyze, "parse_resume_only", lambda *_, **__: fake_result_factory().resume_profile)
    resp = client.post("/resume/only", json={"resume_text": "r"})
    assert resp.status_code == 200
    assert resp.json()["profile"]["title"] == "后端工程师"


def test_resume_only_pipeline_error(monkeypatch, temp_app):
    analyze, client = temp_app
    monkeypatch.setattr(
        analyze, "parse_resume_only", lambda *_, **__: (_ for _ in ()).throw(analyze.PipelineError("oops"))
    )
    resp = client.post("/resume/only", json={"resume_text": "r"})
    assert resp.status_code == 400


def test_history_not_found(monkeypatch, temp_app):
    analyze, client = temp_app
    monkeypatch.setattr(analyze, "get_analysis", lambda *_: None)
    resp = client.get("/history/absent")
    assert resp.status_code == 404


def test_history_with_draft(monkeypatch, temp_app, fake_result_factory):
    analyze, client = temp_app
    result = fake_result_factory()
    monkeypatch.setattr(analyze, "get_analysis", lambda *_: result)
    monkeypatch.setattr(analyze, "get_draft_result", lambda *_: result)
    resp = client.get("/history/exist")
    assert resp.status_code == 200
    data = resp.json()
    assert data["analysis_id"] == "exist"
    assert data["draft_result"]["custom_resume_markdown"] == "md"


def test_get_draft_missing(monkeypatch, temp_app):
    analyze, client = temp_app
    monkeypatch.setattr(analyze, "get_draft_result", lambda *_: None)
    resp = client.get("/analysis/none/draft")
    assert resp.status_code == 404


def test_put_draft_not_found(monkeypatch, temp_app, fake_result_factory):
    analyze, client = temp_app
    monkeypatch.setattr(analyze, "get_analysis", lambda *_: None)
    payload = {"result": fake_result_factory().model_dump()}
    resp = client.put("/analysis/none/draft", json=payload)
    assert resp.status_code == 404


def test_put_draft_success(monkeypatch, temp_app, fake_result_factory):
    analyze, client = temp_app
    result = fake_result_factory()
    monkeypatch.setattr(analyze, "get_analysis", lambda *_: result)
    called = {}

    def _save(aid, data):
        called["aid"] = aid
        called["data"] = data

    monkeypatch.setattr(analyze, "save_draft_result", _save)
    payload = {"result": result.model_dump()}
    resp = client.put("/analysis/a1/draft", json=payload)
    assert resp.status_code == 200
    assert called["aid"] == "a1"
    assert resp.json()["draft_result"]["custom_resume_markdown"] == "md"


def test_llm_config_mask(monkeypatch, temp_app):
    analyze, client = temp_app
    monkeypatch.setattr(analyze, "resolve_default_api_key", lambda: "sk-1234567890")
    resp = client.get("/llm/config")
    assert resp.status_code == 200
    data = resp.json()
    # 中文注释：默认 key 存在时应返回掩码字段
    assert data["has_default_key"] is True
    assert data["masked_key"].startswith("sk-123")


def test_analyze_stream_success(monkeypatch, temp_app, fake_result_factory):
    analyze, client = temp_app
    fake_result = fake_result_factory()

    # 中文注释：mock 流水线各阶段返回值，确保 SSE 顺序包含 result/complete
    monkeypatch.setattr(
        analyze,
        "parse_resume_and_job",
        lambda *_,
        **__: (fake_result.resume_profile, fake_result.job_profile, "{}", None),
    )
    monkeypatch.setattr(
        analyze,
        "analyze_gaps_and_mapping",
        lambda *_,
        **__: (fake_result.gap_analysis, fake_result.jd_mapping_matrix, "{}", None),
    )
    monkeypatch.setattr(
        analyze,
        "generate_learning_plan",
        lambda *_,
        **__: (fake_result.learning_plan, "{}", None),
    )
    monkeypatch.setattr(
        analyze,
        "generate_custom_resume",
        lambda *_,
        **__: (fake_result.custom_resume_markdown, "{}", None),
    )
    monkeypatch.setattr(analyze, "save_analysis", lambda *_, **__: "run-1")

    resp = client.post("/analyze/stream", json={"resume_text": "r", "jd_text": "j"})
    body = "".join(resp.iter_text())
    # 事件流中应包含 result 与 complete 标记
    assert "event: result" in body
    assert "event: complete" in body
    assert "analysis_id" in body


def test_analyze_stream_llm_error(monkeypatch, temp_app):
    analyze, client = temp_app

    def _fail(*_, **__):
        raise analyze.LLMClientError("llm down")

    monkeypatch.setattr(analyze, "parse_resume_and_job", _fail)
    resp = client.post("/analyze/stream", json={"resume_text": "r", "jd_text": "j"})
    body = "".join(resp.iter_text())
    assert "event: error" in body
    assert "llm down" in body
