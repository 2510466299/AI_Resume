"""
Prompt templates used by the pipeline. Can be overridden at runtime through the
`/prompts` API which persists updates in SQLite.
"""
from textwrap import dedent
from typing import Dict

from sqlmodel import Session

from .storage import fetch_prompt, upsert_prompt


DEFAULT_PROMPTS: Dict[str, str] = {
    "parse": dedent(
        """
        你是资深技术招聘顾问。读取用户简历（Resume）与 JD，提取结构化画像。
        输出 JSON，字段：
        {
          "resume_profile": { "headline": "", "summary": "", "skills": [], "experiences": [] },
          "job_profile":    { "headline": "", "summary": "", "skills": [], "experiences": [] }
        }
        - skills: [{ "name": "...", "level": "expert|advanced|intermediate|beginner", "importance": 0-1, "evidence": "" }]
        - experiences: [{ "company": "", "title": "", "start": "", "end": "", "summary": "", "highlights": ["..."] }]
        所有文本使用简洁中文，避免客套描述。
        """
    ).strip(),
    "gap": dedent(
        """
        你是差距分析专家，基于解析后的画像给出 Gap。
        输出 JSON:
        {
          "gap_analysis": {
            "overview": "一段总结",
            "gaps": [{
              "skill": "",
              "importance": 0-1,
              "attainability": 0-1,
              "priority": 0-1,
              "reason": "",
              "recommendation": ""
            }]
          },
          "jd_mapping_matrix": {
            "entries": [{
              "jd_item": "",
              "coverage": "Full|Partial|None",
              "evidence": [{ "experience_title": "", "proof": "" }],
              "recommendation": ""
            }]
          }
        }
        priority = importance * attainability。高亮最重要的 5-8 个 Gap。
        """
    ).strip(),
    "plan": dedent(
        """
        你是一名职业教练，针对 Gap 生成学习计划。
        输出 JSON:
        {
          "learning_plan": {
            "phases": [{
              "name": "Phase 1",
              "goal": "",
              "duration_weeks": 2,
              "tasks": [{
                "title": "",
                "description": "",
                "duration_weeks": 1,
                "resources": [{ "title": "", "link": "", "type": "course|doc|repo|video" }]
              }]
            }]
          }
        }
        计划控制在 3-5 个阶段，资源给出真实可搜索关键词或链接。
        """
    ).strip(),
    "customize": dedent(
        """
        你是简历定制专家。根据 JD 与 Gap，把经历重写为 Markdown 简历。
        输出 Markdown 字符串，保持简洁、量化结果，用 bullet list。
        使用中文，标题包括：职业概述、核心技能、项目/经历、教育背景。
        """
    ).strip(),
}


def get_prompt_text(session: Session, key: str) -> str:
    record = fetch_prompt(session, key)
    if record:
        return record.content
    return DEFAULT_PROMPTS.get(key, "")


def set_prompt_text(session: Session, key: str, content: str) -> None:
    upsert_prompt(session, key, content)
