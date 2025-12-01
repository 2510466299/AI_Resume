# AI Career Assistant Implementation Plan

This document mirrors the milestone roadmap referenced in the graduation project brief.

## Milestones

- **M0 – CLI Demo** (✅): backend schemas, prompts, LLM pipeline, and CLI demo streaming JSON to `demo/output.json`.
- **M1 – Web Prototype** (✅): FastAPI `/analyze` endpoint plus React/Vite/Tailwind Analyze tab that triggers the full LLM pipeline.
- **M2 – Feature Pages** (✅): Gap Overview, Plan Board, and Resume Studio tabs, markdown export button, and auxiliary endpoints (`/resume/only`, `/job/only`, `/resume/customize`).
- **M3 – Persistence** (✅): SQLite-backed storage with `/history/{id}` so previous analyses can be reloaded in the UI.

Each milestone builds on the previous one and can be driven entirely by the shared pipeline functions.
