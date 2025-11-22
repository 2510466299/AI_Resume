"""Default Chinese prompt templates metadata for the AI assistant."""
from __future__ import annotations

import json

PARSE_EXAMPLE = json.dumps(
    {
        "resume_profile": {
            "profile_type": "resume",
            "title": "全栈工程师",
            "years_experience": 4.5,
            "skills": [{"name": "Python", "level": "高级", "evidence": "负责后台接口"}],
            "education": [
                {
                    "degree": "本科",
                    "major": "计算机科学",
                    "school": "某大学",
                    "start": "2015",
                    "end": "2019",
                }
            ],
            "experiences": [
                {
                    "id": "exp1",
                    "company": "StartupX",
                    "title": "后端工程师",
                    "start": "2020-01",
                    "end": "2022-12",
                    "description": "负责设计与实现 FastAPI 服务",
                }
            ],
            "requirements": None,
        },
        "job_profile": {
            "profile_type": "job",
            "title": "资深后端工程师",
            "years_experience": 5,
            "skills": [
                {"name": "FastAPI", "level": "专家", "evidence": "JD 关键要求"}
            ],
            "education": [],
            "experiences": [],
            "requirements": {
                "must_have": ["FastAPI", "PostgreSQL"],
                "nice_to_have": ["LLM 编排"]
            },
        },
    },
    indent=2,
    ensure_ascii=False,
)

GAP_EXAMPLE = json.dumps(
    {
        "gap_analysis": {
            "gaps": [
                {
                    "id": "gap1",
                    "name": "系统设计",
                    "importance": 0.9,
                    "attainability": 0.6,
                    "priority": 0.54,
                    "reason": "JD 要求主导大型架构，简历缺少案例",
                }
            ]
        },
        "jd_mapping_matrix": {
            "jd_points": [
                {
                    "id": "jd1",
                    "text": "设计高并发 REST API",
                    "category": "后端",
                    "required_level": "高级",
                    "mandatory": True,
                }
            ],
            "resume_mapping": [
                {
                    "jd_point_id": "jd1",
                    "coverage": "partial",
                    "match_experiences": [
                        {"experience_id": "exp1", "evidence": "负责 FastAPI 接口"}
                    ],
                }
            ],
        },
    },
    indent=2,
    ensure_ascii=False,
)

PLAN_EXAMPLE = json.dumps(
    {
        "learning_plan": {
            "phases": [
                {
                    "name": "基础阶段",
                    "duration_weeks": 4,
                    "goals": ["补齐分布式系统基础"],
                    "tasks": [
                        {
                            "title": "阅读分布式系统课程",
                            "estimated_hours": 10,
                            "resources": [
                                {"title": "MIT 6.824", "url": "https://example.com"}
                            ],
                        }
                    ],
                }
            ]
        }
    },
    indent=2,
    ensure_ascii=False,
)

PROMPT_METADATA = {
    "parse_profile": {
        "description": "解析简历与 JD，生成结构化画像",
        "placeholders": ["resume_text", "jd_text", "example"],
        "template": """
你是一名资深招聘分析师。请阅读“简历文本”和“职位描述”，输出严格符合下列 JSON 结构的数据。只能返回 JSON，禁止出现额外说明。
JSON 结构示例：
{example}

请遵循规则：
1. `resume_profile` 与 `job_profile` 都必须返回，即使文本为空也要填默认值（空数组、0）。
2. `profile_type` 取值为 "resume" 或 "job"；`requirements.must_have`、`nice_to_have` 不能为空时请使用空数组。

简历文本：
```
{resume_text}
```

职位描述：
```
{jd_text}
```
""".strip(),
    },
    "gap_analysis": {
        "description": "对比简历和 JD，输出差距分析与 JD 映射",
        "placeholders": ["resume_profile_json", "job_profile_json", "example"],
        "template": """
你是一名职业发展顾问。请比较候选人画像与 JD 画像，输出差距分析与 JD→简历映射矩阵。必须只输出 JSON，结构参考：
{example}

字段要求：importance、attainability、priority 取值范围 [0,1]，且 priority = importance * attainability。

候选人画像 JSON：
```json
{resume_profile_json}
```

职位画像 JSON：
```json
{job_profile_json}
```
""".strip(),
    },
    "learning_plan": {
        "description": "基于差距生成学习计划",
        "placeholders": ["gap_analysis_json", "example"],
        "template": """
你是职业教练，请根据 `gap_analysis` 生成 2-4 个阶段的学习计划，每个阶段包含持续周数、阶段目标、任务（任务包含预计小时与资源链接）。仅输出如下 JSON 结构：
{example}

差距分析 JSON：
```json
{gap_analysis_json}
```
""".strip(),
    },
    "custom_resume": {
        "description": "生成面向目标 JD 的定制简历 Markdown",
        "placeholders": ["resume_text", "jd_text"],
        "template": """
请根据简历与 JD 改写简历内容，输出 Markdown，包含【摘要】【技能】【经历】【成果】等部分，强调与 JD 最匹配的亮点，保持真实可信。仅输出 JSON：
{{"custom_resume_markdown": "..."}}

简历文本：
```
{resume_text}
```

职位描述：
```
{jd_text}
```
""".strip(),
    },
}

# 为方便模板渲染，提供示例映射
PROMPT_EXAMPLES = {
    "parse_profile": PARSE_EXAMPLE,
    "gap_analysis": GAP_EXAMPLE,
    "learning_plan": PLAN_EXAMPLE,
    "custom_resume": "",
}
