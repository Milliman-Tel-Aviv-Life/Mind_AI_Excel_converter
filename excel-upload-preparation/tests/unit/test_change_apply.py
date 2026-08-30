import json
from pathlib import Path

import pytest

from app.change_apply import fix_loop_case_mismatch, plan_loop_case_fix
from app.config import load_config
from app.excel_com import com_available
from app.inventory import build_analysis
from app.rules_engine import RulesEngine
from app.validators import run_rule

needs_excel = pytest.mark.skipif(not com_available(), reason="requires pywin32 + an installed Excel")


def test_plan_loop_case_fix_computes_edits_without_touching_files(tmp_path, loops_broken_xlsx):
    before = loops_broken_xlsx.read_bytes()
    analysis = build_analysis(loops_broken_xlsx, tmp_path / "before", "b0")
    renames, edits = plan_loop_case_fix(analysis)
    assert renames == {"scenario": "Scenario"}
    assert [e["cell"] for e in edits] == ["B3"]
    assert loops_broken_xlsx.read_bytes() == before


def test_fix_loop_case_mismatch_resolves_loop002(tmp_path, loops_broken_xlsx):
    analysis = build_analysis(loops_broken_xlsx, tmp_path / "before", "b1")
    result = fix_loop_case_mismatch(loops_broken_xlsx, tmp_path / "fix", analysis, prefer_excel=False)

    assert result["status"] == "APPLIED"
    assert result["method"] == "openpyxl"
    output_path = Path(result["output_path"])
    assert output_path.is_file()
    assert result["change_log_entry"]["changed_cells"]  # at least one cell rewritten

    engine = RulesEngine()
    config = load_config()
    after_analysis = build_analysis(output_path, tmp_path / "after", "a1")
    finding = run_rule(engine.get("LOOP-002"), after_analysis, config)
    assert finding["status"] == "PASS"


def test_fix_loop_case_mismatch_writes_changelog_sidecar(tmp_path, loops_broken_xlsx):
    analysis = build_analysis(loops_broken_xlsx, tmp_path / "before", "b1")
    result = fix_loop_case_mismatch(loops_broken_xlsx, tmp_path / "fix", analysis, prefer_excel=False)

    log_path = Path(str(result["output_path"]) + ".changelog.json")
    assert log_path.is_file()
    entries = json.loads(log_path.read_text(encoding="utf-8"))
    assert entries[0]["rule_id"] == "LOOP-002"
    assert entries[0]["action"] == "fix_loop_case_mismatch"
    assert entries[0]["method"] == "openpyxl"
    assert "timestamp" in entries[0]


def test_fix_loop_case_mismatch_not_applicable_when_no_mismatch(tmp_path, loops_ok_xlsx):
    analysis = build_analysis(loops_ok_xlsx, tmp_path / "before", "b1")
    result = fix_loop_case_mismatch(loops_ok_xlsx, tmp_path / "fix", analysis, prefer_excel=False)
    assert result["status"] == "NOT_APPLICABLE"


def test_source_file_never_modified_by_apply(tmp_path, loops_broken_xlsx):
    before_bytes = loops_broken_xlsx.read_bytes()
    analysis = build_analysis(loops_broken_xlsx, tmp_path / "before", "b1")
    fix_loop_case_mismatch(loops_broken_xlsx, tmp_path / "fix", analysis, prefer_excel=False)
    assert loops_broken_xlsx.read_bytes() == before_bytes


@needs_excel
def test_fix_written_by_excel_is_verified_and_resolves_loop002(tmp_path, loops_broken_xlsx):
    analysis = build_analysis(loops_broken_xlsx, tmp_path / "before", "b2")
    result = fix_loop_case_mismatch(loops_broken_xlsx, tmp_path / "fix", analysis)
    assert result["status"] == "APPLIED"
    assert result["method"] == "excel_com"
    assert result["verified_opens_in_excel"] is True
    after_analysis = build_analysis(Path(result["output_path"]), tmp_path / "after", "a2")
    assert run_rule(RulesEngine().get("LOOP-002"), after_analysis, load_config())["status"] == "PASS"
