import json
from pathlib import Path

import jsonschema
import pytest

from app.config import load_config
from app.modes import plan_mode, prep_mind_loops, structure_fix

PACKAGE_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture
def processing_result_validator():
    schema = json.loads((PACKAGE_ROOT / "schemas" / "processing-result.schema.json").read_text())
    return jsonschema.Draft202012Validator(schema)


@pytest.fixture
def validation_report_validator():
    schema = json.loads((PACKAGE_ROOT / "schemas" / "validation-report.schema.json").read_text())
    return jsonschema.Draft202012Validator(schema)


def test_plan_mode_output_is_schema_valid_and_never_pass(
    tmp_path, loops_broken_xlsx, processing_result_validator, validation_report_validator
):
    config = load_config()
    result = plan_mode.run(loops_broken_xlsx, tmp_path / "work", config)

    processing_result_validator.validate(result["processing_result"])
    validation_report_validator.validate(result["validation_report"])

    assert result["processing_result"]["status"] != "PASS"  # no recalculation adapter yet
    assert result["processing_result"]["mode"] == "PLAN_MODE"
    assert result["rule_load_errors"] == []


def test_plan_mode_runs_every_active_rule(tmp_path, plain_grid_xlsx):
    from app.rules_engine import RulesEngine

    engine = RulesEngine()
    config = load_config()
    result = plan_mode.run(plain_grid_xlsx, tmp_path / "work", config, engine=engine)
    finding_ids = {f["rule_id"] for f in result["validation_report"]["findings"]}
    assert finding_ids == {r["id"] for r in engine.active_rules()}


def test_not_supported_findings_have_explanatory_messages(tmp_path, plain_grid_xlsx):
    config = load_config()
    result = plan_mode.run(plain_grid_xlsx, tmp_path / "work", config)
    not_supported = [f for f in result["validation_report"]["findings"] if f["status"] == "NOT_SUPPORTED"]
    assert not_supported  # recalculation + several unimplemented rules
    assert any(f["rule_id"] == "READY-001" for f in not_supported)
    assert all(f["message"] for f in not_supported)


def test_prep_mind_loops_only_runs_loop_and_baseline_rules(tmp_path, loops_ok_xlsx):
    config = load_config()
    result = prep_mind_loops.run(loops_ok_xlsx, tmp_path / "work", config)
    rule_ids = {f["rule_id"] for f in result["validation_report"]["findings"]}
    assert "LOOP-001" in rule_ids
    assert not any(rid.startswith("STR-") for rid in rule_ids)
    assert result["processing_result"]["output"] is None  # no change-set application in this MVP


def test_structure_fix_output_stays_null(tmp_path, messy_workbook_xlsx):
    config = load_config()
    result = structure_fix.run(messy_workbook_xlsx, tmp_path / "work", config)
    assert result["processing_result"]["output"] is None
