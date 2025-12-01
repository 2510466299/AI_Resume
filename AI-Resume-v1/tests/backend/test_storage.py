"""存储层测试，验证 SQLite 读写、草稿历史与提示模板。"""
from __future__ import annotations

import importlib
import os

import pytest


@pytest.fixture()
def storage(tmp_path, monkeypatch):
    """中文注释：重载 storage 模块，指向临时数据库。"""
    monkeypatch.setenv("ANALYSIS_DB_PATH", str(tmp_path / "store.db"))
    from sqlmodel import SQLModel
    import sys
    import importlib

    SQLModel.metadata.clear()
    sys.modules.pop("backend.storage", None)
    storage = importlib.import_module("backend.storage")
    storage.init_db()
    return storage


def test_save_and_get_analysis(storage, fake_result_factory):
    result = fake_result_factory()
    aid = storage.save_analysis("r", "j", result)
    loaded = storage.get_analysis(aid)
    assert loaded.custom_resume_markdown == "md"


def test_save_draft_and_history(storage, fake_result_factory):
    result = fake_result_factory()
    aid = storage.save_analysis("r", "j", result)
    # 中文注释：首次保存草稿，history 为空
    storage.save_draft_result(aid, result)
    draft = storage.get_draft_result(aid)
    assert draft.custom_resume_markdown == "md"
    # 第二次保存应产生历史记录
    result.custom_resume_markdown = "md-2"
    storage.save_draft_result(aid, result)
    draft2 = storage.get_draft_result(aid)
    assert draft2.custom_resume_markdown == "md-2"


def test_clear_draft(storage, fake_result_factory):
    aid = storage.save_analysis("r", "j", fake_result_factory())
    storage.save_draft_result(aid, fake_result_factory())
    storage.clear_draft(aid)
    assert storage.get_draft_result(aid) is None


def test_prompt_template_crud(storage):
    # 中文注释：默认种子应自动落表
    prompts = storage.list_prompt_templates()
    assert len(prompts) >= 1
    storage.update_prompt_template("custom", "hello")
    assert storage.get_prompt_template("custom") == "hello"


def test_storage_error_on_invalid_db(monkeypatch, fake_result_factory):
    # 中文注释：伪造错误 engine 触发 StorageError
    import backend.storage as storage

    # 清理元数据避免重复表定义
    from sqlmodel import SQLModel

    SQLModel.metadata.clear()
    storage = importlib.reload(storage)
    storage.engine = None  # type: ignore
    with pytest.raises(storage.StorageError):
        storage.get_analysis("x")
