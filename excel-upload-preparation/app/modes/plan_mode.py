"""PLAN_MODE: analyze and report only, across every active rule. Matches
modes/plan-mode.md exactly -- this is the one mode fully realizable in the
MVP scope (no TRANSFORM step is needed since it never applies changes)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..rules_engine import RulesEngine
from ..models import Mode
from .common import run_mode


def run(source_path: Path, work_dir: Path, config: dict[str, Any], engine: RulesEngine | None = None) -> dict[str, Any]:
    return run_mode(Mode.PLAN_MODE, source_path, work_dir, config, categories=None, engine=engine)
