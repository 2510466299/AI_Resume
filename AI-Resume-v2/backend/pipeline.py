import asyncio
import json
from dataclasses import dataclass
from typing import AsyncGenerator, List
from uuid import uuid4

from sqlmodel import Session

from .llm_client import LLMClient
from .prompts import get_prompt_text
from .schemas import AnalyzeRequest, FullAnalysisResult, StreamEvent
from .storage import AnalysisRecord, persist_analysis


ANALYSIS_TIMEOUT_SECONDS = 180


@dataclass
class PipelineContext:
    session: Session
    logs: List[str]

    def add_log(self, text: str) -> None:
        self.logs.append(text)


def build_system_prompt(parse_p: str, gap_p: str, plan_p: str, customize_p: str) -> str:
    parts = [
        "你是 AI 职业教练，输出结构化 JSON（UTF-8，无注释）。",
        parse_p,
        gap_p,
        plan_p,
        customize_p,
        (
            "最终 JSON 结构严格为 FullAnalysisResult："
            "{ \"resume_profile\": {}, \"job_profile\": {}, "
            "\"gap_analysis\": {}, \"jd_mapping_matrix\": {}, "
            "\"learning_plan\": {}, \"custom_resume_markdown\": \"...\" }。"
            "custom_resume_markdown 填写 Markdown 字符串，换行保留。"
        ),
    ]
    return "\n\n".join(parts)


def build_user_prompt(req: AnalyzeRequest) -> str:
    return (
        "【用户简历】\n"
        f"{req.resume_text}\n\n"
        "【目标 JD】\n"
        f"{req.jd_text}\n\n"
        "请基于以上内容输出 JSON。"
    )


def build_mock_result(req: AnalyzeRequest) -> FullAnalysisResult:
    """Offline fallback so front-end可用，即便未配置 API Key。"""
    resume_skills = [
        {"name": skill.strip(), "level": "intermediate", "evidence": ""}
        for skill in req.resume_text.split(",")[:5]
        if skill.strip()
    ]
    jd_skills = [
        {"name": skill.strip(), "level": "advanced", "importance": 0.8}
        for skill in req.jd_text.split(",")[:5]
        if skill.strip()
    ]
    gaps = []
    for idx, skill in enumerate(jd_skills):
        priority = 0.8 - idx * 0.1
        gaps.append(
            {
                "skill": skill["name"],
                "importance": skill.get("importance", 0.6),
                "attainability": 0.6 + idx * 0.05,
                "priority": max(priority, 0.2),
                "reason": "JD 需要该技能，简历匹配度不足",
                "recommendation": "补充对应项目或学习记录",
            }
        )
    mapping_entries = [
        {
            "jd_item": skill["name"],
            "coverage": "Partial",
            "evidence": [{"experience_title": "Mock Project", "proof": "占位示例"}],
            "recommendation": "补充具体成果",
        }
        for skill in jd_skills[:6]
    ]
    plan_phases = []
    for i in range(3):
        plan_phases.append(
            {
                "name": f"Phase {i + 1}",
                "goal": "提升关键技能并产出作品",
                "duration_weeks": 2 + i,
                "tasks": [
                    {
                        "title": f"任务 {i + 1}",
                        "description": "完成在线课程并实践",
                        "duration_weeks": 1.5,
                        "resources": [
                            {
                                "title": f"课程 {i + 1}",
                                "link": "https://example.com",
                                "type": "course",
                            }
                        ],
                    }
                ],
            }
        )
    return FullAnalysisResult.parse_obj(
        {
            "resume_profile": {
                "headline": "候选人",
                "summary": "未连接 LLM，展示示例数据。",
                "skills": resume_skills,
                "experiences": [
                    {
                        "company": "Demo Corp",
                        "title": "工程师",
                        "start": "2021",
                        "end": "2023",
                        "summary": "示例经历",
                        "highlights": ["占位 bullet"],
                    }
                ],
            },
            "job_profile": {
                "headline": "目标职位",
                "summary": "根据 JD 生成的示例画像",
                "skills": jd_skills,
                "experiences": [],
            },
            "gap_analysis": {"overview": "示例差距", "gaps": gaps},
            "jd_mapping_matrix": {"entries": mapping_entries},
            "learning_plan": {"phases": plan_phases},
            "custom_resume_markdown": "\n".join(
                [
                    "# 自定义简历（示例）",
                    "## 核心技能",
                    "- 技能 A: 描述",
                    "## 经历",
                    "- Demo Corp | 工程师 (2021-2023)",
                    "  - bullet 示例",
                ]
            ),
        }
    )


async def stream_analysis(
    req: AnalyzeRequest, session: Session
) -> AsyncGenerator[StreamEvent, None]:
    ctx = PipelineContext(session=session, logs=[])
    record = AnalysisRecord(
        id=str(uuid4()), resume_text=req.resume_text, jd_text=req.jd_text
    )

    def log(stage: str, message: str) -> StreamEvent:
        ctx.add_log(f"{stage}: {message}")
        return StreamEvent(
            type="log", stage=stage, message=message, analysis_id=record.id
        )

    try:
        yield log("start", "启动分析任务")
        parse_prompt = get_prompt_text(session, "parse")
        gap_prompt = get_prompt_text(session, "gap")
        plan_prompt = get_prompt_text(session, "plan")
        customize_prompt = get_prompt_text(session, "customize")
        system_prompt = build_system_prompt(parse_prompt, gap_prompt, plan_prompt, customize_prompt)
        user_prompt = build_user_prompt(req)

        result: FullAnalysisResult
        try:
            llm = LLMClient(req.api_key, req.base_url, req.model)
            yield log("llm", f"调用模型 {req.model}")

            async def run_llm() -> FullAnalysisResult:
                data = await llm.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=FullAnalysisResult,
                )
                return data

            result = await asyncio.wait_for(
                run_llm(), timeout=ANALYSIS_TIMEOUT_SECONDS
            )
        except Exception as exc:  # noqa: BLE001
            yield log("fallback", f"LLM 不可用，使用本地示例数据: {exc}")
            result = build_mock_result(req)

        persist_analysis(
            session,
            record,
            result=json.loads(result.json()),
            logs=ctx.logs,
        )
        yield log("persisted", "已保存到 SQLite")
        yield StreamEvent(
            type="result",
            stage="completed",
            analysis_id=record.id,
            payload=result,
            message="分析完成",
        )
        yield StreamEvent(
            type="end", stage="completed", analysis_id=record.id, message="done"
        )
    except asyncio.TimeoutError:
        yield StreamEvent(
            type="error",
            stage="timeout",
            analysis_id=record.id,
            message="超时 3 分钟未完成",
        )
    except Exception as exc:  # noqa: BLE001
        yield StreamEvent(
            type="error",
            stage="failed",
            analysis_id=record.id,
            message=str(exc),
        )
