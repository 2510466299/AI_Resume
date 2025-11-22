# AI Career Assistant (Minimal LLM Edition)

This project follows the graduation design brief for an AI-driven career development assistant. Implementation is milestone-based (M0–M3) with a shared LLM pipeline powering both CLI and web surfaces.

## Getting Started

### Backend (uv + FastAPI)

1. Copy `.env.example` → `.env` or define `DEEPSEEK_API_KEY` / `OPENAI_API_KEY`.
2. Install dependencies with [uv](https://github.com/astral-sh/uv):

   ```bash
   uv sync
   ```

3. Run the CLI demo (M0 validation):

   ```bash
   uv run python demo/demo.py
   ```

4. Start the FastAPI server (M1/M2):

   ```bash
   uv run uvicorn backend.main:app --reload
   ```

SQLite 会在项目根目录生成 `analysis.db`（可通过 `DATABASE_URL` / `ANALYSIS_DB_PATH` 覆盖）。这是 M3 持久化层用于 `/history` 查询的存储位置。

### Frontend (Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

The web prototype exposes Analyze, Gap Overview, Plan Board, Resume Studio, and History tabs powered entirely by the backend pipeline.

### REST Endpoints

- `POST /analyze` – full analysis returning resume & job profiles, gaps, JD mapping, learning plan, and custom resume markdown.
- `POST /analyze/stream` – SSE 流式接口，按顺序推送解析/差距/学习计划/定制简历的 LLM 输出，事件类型包含 `llm_output`、`result`、`error`、`complete`。
- `POST /resume/only` – parse resume text into a structured profile.
- `POST /job/only` – parse job description into a structured profile with requirements lists.
- `POST /resume/customize` – generate Markdown resume tailored to the provided JD.
- `GET /history/{analysis_id}` – load any previous `/analyze` result persisted to SQLite.
- `GET /prompts` & `PUT /prompts/{name}` – 查看/编辑各模块提示词，变更会持久化到 SQLite 并实时生效。

See `docs/PLAN.md` for milestone notes and roadmap (M0–M3).
