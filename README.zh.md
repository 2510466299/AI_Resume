# AI 职业发展辅助系统

本项目提供 CLI + Web 的 AI 职业发展助手，基于 FastAPI + SQLite 后端和 React/Vite/Tailwind 前端。后端使用 LLM 解析简历与 JD，输出差距分析、学习计划、JD 映射与定制简历，并支持 SSE 实时流式输出。前端提供多标签页体验，包含分析、差距总览、计划看板、简历工作室、历史记录与提示词管理。

## 功能概览
- **LLM 管道**：解析画像 → 差距映射 → 学习计划 → 定制简历，提示词可在 DB/前端编辑。
- **接口**：`/analyze`、`/analyze/stream`（SSE）、`/resume|job/only`、`/resume/customize`、`/history/{id}`、`/analysis/{id}/draft`、`/prompts`、`/llm/config`。
- **前端**：Analyze 标签页可实时流式展示；Plan/Resume 支持编辑与草稿保存；History 按 analysis_id 加载；Prompts 在线调整模板。
- **持久化**：LLM 原始结果与草稿存 SQLite，草稿支持最多 10 次撤回。

## 快速开始
### 后端
```bash
# 创建并激活虚拟环境（示例）
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 启动 FastAPI（开发）
uvicorn backend.main:app --reload --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 运行流程
1. 前端收集简历/JD 与模型配置，调用 `/analyze/stream`。
2. 后端串行执行解析画像 → 差距/映射 → 学习计划 → 定制简历，每阶段可通过 SSE 推送原始 JSON。
3. 成功后写入 SQLite，生成 `analysis_id`；前端据此更新历史与草稿。
4. Plan/Resume 标签页可继续编辑并保存到 `/analysis/{id}/draft`，默认优先返回草稿版。

## 提示词与模型设置
- 提示词模板可通过 `/prompts` API 读取/更新，保存后立即生效。
- 模型配置支持自定义 API Key/Endpoint/模型名，默认使用 DeepSeek V3（Key 会掩码展示）。

## 注意事项
- LLM 输出需符合 `schemas.py` 定义的 JSON 结构，`coverage` 归一化为 `full/partial/none`。
- SSE 事件类型固定：`run`、`llm_output`、`result`、`error`、`complete`。
- 运行中禁用重复分析，默认 3 分钟超时，可手动终止；依赖 localStorage 同步草稿状态。

## 项目结构
- `backend/`：FastAPI 路由、管道、提示词、存储与模式定义。
- `frontend/`：React/Vite 前端，多标签页 UI 与模型配置面板。
- `demo/`：CLI 示例与样例简历/JD。

## 许可证
请根据仓库许可文件（若有）遵循相应条款。
