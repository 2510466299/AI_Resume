"""pipeline 核心函数测试，聚焦 JSON 解析与异常分支。"""
from __future__ import annotations

import json

import pytest

import backend.pipeline as pipeline
from backend.schemas import GapAnalysisResult, JDMappingMatrix, Profile


def test_strip_code_fence_and_loads_success():
    # 中文注释：带 ```json 包裹的字符串应正确解析
    payload = "```json\n{\"a\":1}\n```"
    assert pipeline._strip_code_fence(payload) == '{"a":1}'
    assert pipeline._loads(payload) == {"a": 1}


def test_loads_invalid_json():
    # 中文注释：非法 JSON 应抛 PipelineError
    with pytest.raises(pipeline.PipelineError):
        pipeline._loads("```json {bad```")


def test_normalize_coverage_value():
    assert pipeline._normalize_coverage_value("Strong") == "full"
    assert pipeline._normalize_coverage_value("weak") == "partial"
    assert pipeline._normalize_coverage_value("missing") == "none"
    assert pipeline._normalize_coverage_value(None) == "none"


def test_parse_resume_and_job_success(monkeypatch):
    # 中文注释：mock LLM 返回，校验模型验证与返回元组
    resume = {
        "resume_profile": {"profile_type": "resume", "title": "r", "years_experience": 1, "skills": [], "education": [], "experiences": []},
        "job_profile": {"profile_type": "job", "title": "j", "years_experience": 2, "skills": [], "education": [], "experiences": []},
    }
    monkeypatch.setattr(pipeline, "_call_with_config", lambda *_, **__: json.dumps(resume))
    res = pipeline.parse_resume_and_job("r", "j")
    assert isinstance(res[0], Profile)
    assert res[0].title == "r"


def test_parse_resume_and_job_missing_key(monkeypatch):
    monkeypatch.setattr(pipeline, "_call_with_config", lambda *_, **__: "{}")
    with pytest.raises(pipeline.PipelineError):
        pipeline.parse_resume_and_job("r", "j")


def test_analyze_gaps_and_mapping_normalize(monkeypatch):
    payload = {
        "gap_analysis": {"gaps": []},
        "jd_mapping_matrix": {
            "jd_points": [],
            "resume_mapping": [{"jd_point_id": "1", "coverage": "Weak", "match_experiences": []}],
        },
    }
    monkeypatch.setattr(pipeline, "_call_with_config", lambda *_, **__: json.dumps(payload))
    gap, matrix, _, _ = pipeline.analyze_gaps_and_mapping(Profile.model_validate({"profile_type": "resume", "title": "", "years_experience": 0, "skills": [], "education": [], "experiences": []}), Profile.model_validate({"profile_type": "job", "title": "", "years_experience": 0, "skills": [], "education": [], "experiences": []}), return_raw=True)
    assert isinstance(gap, GapAnalysisResult)
    assert isinstance(matrix, JDMappingMatrix)
    assert matrix.resume_mapping[0].coverage == "partial"


def test_generate_learning_plan_missing(monkeypatch):
    payload = "{}"
    monkeypatch.setattr(pipeline, "_call_with_config", lambda *_, **__: payload)
    with pytest.raises(pipeline.PipelineError):
        pipeline.generate_learning_plan(GapAnalysisResult(gaps=[]))


def test_generate_custom_resume_type_error(monkeypatch):
    payload = json.dumps({"custom_resume_markdown": 123})
    monkeypatch.setattr(pipeline, "_call_with_config", lambda *_, **__: payload)
    with pytest.raises(pipeline.PipelineError):
        pipeline.generate_custom_resume("r", "j")


def test_run_full_analysis_composes(monkeypatch):
    # 中文注释：组合路径中各子函数已被 mock，验证返回结构
    profile = Profile(
        profile_type="resume", title="r", years_experience=1, skills=[], education=[], experiences=[], requirements=None
    )
    job = Profile(
        profile_type="job", title="j", years_experience=2, skills=[], education=[], experiences=[], requirements=None
    )
    gap = GapAnalysisResult(gaps=[])
    matrix = JDMappingMatrix(jd_points=[], resume_mapping=[])
    monkeypatch.setattr(pipeline, "parse_resume_and_job", lambda *_, **__: (profile, job, None, None))
    monkeypatch.setattr(pipeline, "analyze_gaps_and_mapping", lambda *_, **__: (gap, matrix, None, None))
    monkeypatch.setattr(pipeline, "generate_learning_plan", lambda *_, **__: ({}, None, None))
    monkeypatch.setattr(pipeline, "generate_custom_resume", lambda *_, **__: ("md", None, None))
    result = pipeline.run_full_analysis("r", "j")
    assert result.custom_resume_markdown == "md"
