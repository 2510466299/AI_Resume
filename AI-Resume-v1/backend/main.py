"""FastAPI entrypoint configuring routers and middleware."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import analyze, prompts
from .storage import init_db


app = FastAPI(title="AI Career Assistant", version="0.1.0")
init_db()

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(prompts.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Simple health endpoint for smoke tests."""
    return {"status": "ok"}
