from app.rules_engine import RulesEngine


def test_every_mined_rule_loads_without_schema_errors():
    engine = RulesEngine()
    assert engine.errors == []


def test_rule_count_and_no_duplicate_ids():
    engine = RulesEngine()
    assert len(engine.rules) >= 90
    # RulesEngine._load() already refuses duplicate ids into self.rules;
    # confirm none were silently dropped as duplicates.
    dup_errors = [e for e in engine.errors if "duplicate" in e.message]
    assert dup_errors == []


def test_categories_match_their_validator_dotted_paths():
    """Every active rule's `category` should equal the middle segment of its
    own `validation.implementation` path -- otherwise mode category filters
    silently miss it (this caught a real bug during development: FORMAT-001/
    GRID-001/GRID-004/READY-001 used a different category string than their
    own validator path)."""
    engine = RulesEngine()
    mismatches = []
    for rule in engine.active_rules():
        impl = rule["validation"]["implementation"]
        parts = impl.split(".")
        if len(parts) == 3 and parts[0] == "validators":
            if parts[1] != rule["category"]:
                mismatches.append((rule["id"], rule["category"], impl))
    assert mismatches == []


def test_draft_multi_workbook_rules_excluded_from_active():
    engine = RulesEngine()
    active_ids = {r["id"] for r in engine.active_rules()}
    assert not any(rid.startswith("INS-") or rid.startswith("LNK-") for rid in active_ids)
    draft_ids = [r["id"] for r in engine.rules.values() if r["status"] == "draft"]
    assert any(rid.startswith("INS-") for rid in draft_ids)
    assert any(rid.startswith("LNK-") for rid in draft_ids)
