"""CLI demo that runs the full analysis over sample resume/JD."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from rich import print

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT.parent))  # allow `backend` imports when executed as a script

from backend.pipeline import PipelineError, run_full_analysis  # noqa: E402
from backend.llm_client import LLMClientError  # noqa: E402
from backend.storage import init_db  # noqa: E402


def load_text(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def main() -> None:
    init_db()
    resume_text = load_text("resume_sample.txt")
    jd_text = load_text("jd_sample.txt")

    print("[bold cyan]Running AI career analysis demo...[/bold cyan]")
    try:
        result = run_full_analysis(resume_text, jd_text)
    except (LLMClientError, PipelineError) as exc:
        print(f"[bold red]Failed to run analysis:[/bold red] {exc}")
        raise SystemExit(1) from exc

    output_path = ROOT / "output.json"
    output_path.write_text(
        json.dumps(result.model_dump(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"[green]Analysis completed. JSON saved to {output_path}[/green]")
    print("[bold]Resume title:[/bold]", result.resume_profile.title)
    print("[bold]Job title:[/bold]", result.job_profile.title)
    print("[bold]Gap count:[/bold]", len(result.gap_analysis.gaps))
    print("[bold]Learning phases:[/bold]", len(result.learning_plan.phases))


if __name__ == "__main__":
    main()
