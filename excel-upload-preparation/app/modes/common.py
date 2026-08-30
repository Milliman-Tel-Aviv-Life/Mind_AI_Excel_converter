"""Shared ANALYZE -> VALIDATE -> ASK -> REPORT runner for all four modes.
TRANSFORM/VERIFY are intentionally absent (no change-set application or
recalculation adapter in this MVP -- see CHANGELOG.md 1.1.0).
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from ..inventory import build_analysis
from ..models import Mode, ProcessingResult, Status
from ..report import build_validation_report
from ..rules_engine import RulesEngine
from ..validators import run_rule


def _build_question(finding: dict[str, Any]) -> dict[str, Any]:
    return {
        "question_id": f"Q-{finding['rule_id']}",
        "status": "OPEN",
        "blocking": True,
        "rule_ids": [finding["rule_id"]],
        "location": finding.get("location") or {},
        "question": finding["message"],
        "options": [
            {"id": "acknowledge", "label": "Acknowledge and continue without a change"},
            {"id": "provide_target_version", "label": "Provide the missing information referenced above"},
        ],
        "default_if_unanswered": "REQUIRES_USER_INPUT",
    }


def run_mode(
    mode: Mode,
    source_path: Path,
    work_dir: Path,
    config: dict[str, Any],
    categories: list[str] | None,
    engine: RulesEngine | None = None,
) -> dict[str, Any]:
    """categories=None means 'all active rules' (used by PLAN_MODE)."""
    engine = engine or RulesEngine()
    request_id = str(uuid.uuid4())

    analysis = build_analysis(source_path, work_dir, analysis_id=request_id)

    if categories is None:
        rules = engine.active_rules()
    else:
        rules = [r for r in engine.active_rules() if r["category"] in categories]

    findings = [run_rule(rule, analysis, config) for rule in rules]
    validation_report = build_validation_report(findings)

    questions = [
        _build_question(f) for f in findings if f["status"] == "REQUIRES_USER_INPUT"
    ]
    warnings = [f for f in findings if f["status"] == "WARNING"]
    unsupported = [f for f in findings if f["status"] == "NOT_SUPPORTED"]

    overall_status = Status(validation_report["status"])

    result = ProcessingResult(
        schema_version="1.0.0",
        request_id=request_id,
        mode=mode,
        status=overall_status,
        upload_readiness={
            "ready": overall_status == Status.PASS,
            "validation_status": validation_report["status"],
            "recalculation_performed": False,
            "reason": (
                "PASS is unreachable in this MVP: no recalculation adapter is implemented "
                "(READY-001 always reports NOT_SUPPORTED)."
                if overall_status != Status.PASS
                else None
            ),
        },
        source=analysis["source"],
        output=None,
        questions=questions,
        warnings=warnings,
        unsupported_features=unsupported,
    )
    return {
        "processing_result": result.model_dump(mode="json"),
        "workbook_analysis": analysis,
        "validation_report": validation_report,
        "rule_load_errors": [e.__dict__ for e in engine.errors],
    }
