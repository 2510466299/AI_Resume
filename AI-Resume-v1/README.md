# AI Career Assistant (Minimal LLM Edition)

This project follows the graduation design brief for an AI-driven career development assistant. Implementation is milestone-based (M0–M3) with a shared LLM pipeline powering both CLI and web surfaces.

## Getting Started

### Requirements
- Python 3.10+
- [uv](https://github.com/astral-sh/uv) (install with `curl -Ls https://astral.sh/uv/install.sh | sh`)
- Node 18+ (for the frontend)

### Backend (uv + FastAPI)
1. Create a `.env` with your key (dotenv is loaded automatically):
   ```bash
   DEEPSEEK_API_KEY=sk-xxx           # or OPENAI_API_KEY=...
   # Optional overrides:
   # LLM_API_BASE=https://api.deepseek.com/chat/completions
   # LLM_MODEL=deepseek-chat
   # LLM_TIMEOUT=120                  # seconds (default 60)
   # DATABASE_URL=sqlite:///analysis.db
   # ANALYSIS_DB_PATH=./analysis.db
   ```

2. Sync Python deps (uses `pyproject.toml` / `uv.lock`, creates `.venv` automatically):
   ```bash
   uv sync
   ```
   `uv run ...` will auto-activate the environment, so you usually don’t need to `source .venv/bin/activate`.

3. Run the CLI demo (M0 validation):
   ```bash
   uv run python demo/demo.py
   ```

4. Start the FastAPI server (M1/M2):
   ```bash
   uv run uvicorn backend.main:app --reload --port 8000
   ```
   Want the DeepSeek reasoning model? Set `llm_model` to `deepseek-reasoner` (UI toggle) and optionally increase `LLM_TIMEOUT`.

SQLite will be written to `analysis.db` in the repo root by default (override with `DATABASE_URL` or `ANALYSIS_DB_PATH`). This backs `/history` and drafts.

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
