# AI Resume Studio

LLM 驱动的简历与 JD 差距分析、学习计划与定制简历工具。后端基于 FastAPI + SQLModel + SSE，前端使用 React 18 + Vite + Tailwind。

## 目录

```
backend/   # FastAPI 服务，SQLite 持久化
frontend/  # React + Vite 前端
docs/      # 额外文档占位
```

## 快速启动

### 后端

```bash
cd backend
# 创建虚拟环境（uv 推荐）
uv venv .venv
source .venv/bin/activate
uv pip install -e .

# 运行服务
uv run uvicorn backend.main:app --reload --port 8000
```

环境变量：

- `DEEPSEEK_API_KEY`：LLM Key（未设置时自动进入 mock 模式）
- `DEEPSEEK_BASE_URL`：OpenAI 兼容接口，默认 `https://api.deepseek.com`

### 前端

```bash
cd frontend
npm install
npm run dev # 默认 http://localhost:5173
```

前端默认将 API 请求指向 `http://localhost:8000`（可通过 `VITE_API_BASE` 覆盖）。

## 关键特性

- **Analyze（SSE 流式分析）**：提交简历/JD，实时查看阶段日志，超时 3 分钟自动终止。
- **Gap Overview**：按优先级（High/Medium/Low）展示差距卡片。
- **Plan Board**：学习计划看板，支持编辑、Undo/Redo、恢复基线，自动保存草稿到后端。
- **Resume Studio**：覆盖矩阵 + Markdown 编辑/预览，支持一键重新生成。
- **History & Prompts**：SQLite 持久化历史记录与可在线更新的 Prompt 模板。

## API 速览

- `POST /analyze/stream`：SSE 流式分析（请求体见 `backend/schemas.py` -> `AnalyzeRequest`）
- `POST /resume/customize`：重新生成定制简历
- `POST /analysis/{id}/draft`：保存 Plan/Resume 草稿
- `GET /history` / `GET /history/{id}`：历史记录
- `GET/POST /prompts`：Prompt 模板管理

## 开发提示

- 数据库文件位于 `backend/analysis.db`，无需手动创建。
- 未配置 Key 时，后端会返回示例数据方便前端调试。
- Tailwind 设计规范使用 slate/indigo 主色，并提供语义色（rose/amber/emerald）呼应优先级。
