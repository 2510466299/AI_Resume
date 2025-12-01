"""Pytest 配置与公共夹具，确保使用独立的临时数据库并隔离外部依赖。"""
from __future__ import annotations

import importlib
import os
import sys
from typing import Callable

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel


@pytest.fixture()
def temp_app(tmp_path, monkeypatch) -> tuple[object, TestClient]:
    """重载存储模块以指向临时 SQLite，返回 (analyze_module, client)。"""

    db_path = tmp_path / "test.db"
    monkeypatch.setenv("ANALYSIS_DB_PATH", str(db_path))

    # 重置 SQLModel 元数据并清理已加载模块，避免重复定义表
    SQLModel.metadata.clear()
    for mod in [
        "backend.storage",
        "backend.prompt_templates",
        "backend.routers.analyze",
        "backend.main",
        "backend.prompts",
    ]:
        sys.modules.pop(mod, None)

    import backend.storage as storage
    import backend.prompt_templates as prompt_templates
    import backend.routers.analyze as analyze
    import backend.main as main

    client = TestClient(main.app)
    return analyze, client


@pytest.fixture()
def fake_result_factory() -> Callable[[], object]:
    """构造最小可用的 FullAnalysisResult，避免真实 LLM 依赖。"""
    from backend.schemas import (
        FullAnalysisResult,
        GapAnalysisResult,
        JDMappingMatrix,
        LearningPlan,
        Profile,
    )

    def _make() -> FullAnalysisResult:
        empty_profile = Profile(
            profile_type="resume",
            title="后端工程师",
            years_experience=3.0,
            skills=[],
            education=[],
            experiences=[],
            requirements=None,
        )
        job_profile = Profile(
            profile_type="job",
            title="JD",
            years_experience=3.0,
            skills=[],
            education=[],
            experiences=[],
            requirements=None,
        )
        return FullAnalysisResult(
            resume_profile=empty_profile,
            job_profile=job_profile,
            gap_analysis=GapAnalysisResult(gaps=[]),
            jd_mapping_matrix=JDMappingMatrix(jd_points=[], resume_mapping=[]),
            learning_plan=LearningPlan(phases=[]),
            custom_resume_markdown="md",
        )

    return _make
