import asyncio
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import analysis, history, prompts
from .storage import init_db


app = FastAPI(
    title="AI Resume Gap Analyzer",
    version="0.1.0",
    description="LLM 驱动的简历与 JD 差距分析、学习计划与定制简历生成服务。",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(prompts.router)


@app.on_event("startup")
async def on_startup() -> None:
    # DB 初始化不依赖 IO，可直接调用。
    init_db()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
