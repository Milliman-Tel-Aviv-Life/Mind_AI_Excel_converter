"""PREP_MIND_LOOPS: focuses on loop/result/resize rules (modes/prep-mind-loops.md).
ANALYZE+VALIDATE+ASK only in this MVP -- auto-correction (TRANSFORM) needs
change-set application, which isn't built yet, so `output` stays null and
status is capped by the same NOT_SUPPORTED/REQUIRES_USER_INPUT findings that
would otherwise block a real correction."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..rules_engine import RulesEngine
from ..models import Mode
from .common import run_mode

CATEGORIES = ["file", "recalculation", "loop"]


def run(source_path: Path, work_dir: Path, config: dict[str, Any], engine: RulesEngine | None = None) -> dict[str, Any]:
    return run_mode(Mode.PREP_MIND_LOOPS, source_path, work_dir, config, categories=CATEGORIES, engine=engine)
