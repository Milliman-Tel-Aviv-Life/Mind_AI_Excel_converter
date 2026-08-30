"""The mined reference files are checked into references/; these tests pin
the properties the validators rely on, and re-run the miner when the source
.docx is available next to the package."""
import importlib.util
from pathlib import Path

import pytest
import yaml

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
REFERENCES = PACKAGE_ROOT / "references"
DOCX = PACKAGE_ROOT.parent.parent / "CompleteMindDocn.docx"


def _load(name):
    return yaml.safe_load((REFERENCES / name).read_text(encoding="utf-8"))


def test_kb_registry_documents_the_functions_doc02_lacks():
    reg = _load("mm-function-registry-kb.yaml")
    names = {f["function"]: f for f in reg["functions"]}
    for fn in ("MM_LOOPLABELS", "MM_LOOPINSTANCE", "MM_BACKUPBUTTON", "MM_HYPERLINK", "MM_SENSITIVITY", "MM_AOCVALUE"):
        assert fn in names
    assert names["MM_LOOPLABELS"]["documented"] and names["MM_LOOPLABELS"]["syntax"].startswith("=MM_LOOPLABELS(")
    assert names["MM_SETSIZE"]["syntax"] == "=Formula + MM_SETSIZE(NbRows, NbCols)"
    assert not any(f["function"] in ("MM_HYPERLI", "MM_HP") for f in reg["functions"])  # scrape fragments removed


def test_supported_native_list_matches_the_kb_page():
    sup = _load("supported-excel-functions.yaml")
    fns = set(sup["functions"])
    assert {"SUM", "VLOOKUP", "OFFSET", "IFERROR", "MMULT", "NORMINV"} <= fns
    assert not {"XLOOKUP", "LET", "TEXTJOIN", "IFNA", "INDIRECT"} & fns
    assert "Lookup & Reference functions" in sup["categories"]


def test_flag_table_has_the_shapes_the_validators_use():
    flags = {f["name"].lower(): f for f in _load("mind-flags.yaml")["flags"]}
    assert flags["group"]["args"] == 3
    assert flags["backupsource"]["args"] == 1
    assert flags["resize"]["max_args"] == 1
    assert flags["projectsettings"]["unique"] and flags["steplabels"]["unique"]
    assert flags["hiderows"]["where"] == "header"


@pytest.mark.skipif(not DOCX.is_file(), reason="CompleteMindDocn.docx not available next to the package")
def test_miner_reproduces_the_checked_in_files(tmp_path):
    spec = importlib.util.spec_from_file_location("mine_kb_docx", PACKAGE_ROOT / "tools" / "mine_kb_docx.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    lines = mod.read_docx_lines(DOCX)
    pages = mod.split_pages(lines)
    mod.verify_flags(lines)
    functions = mod.mine_functions(pages)
    checked_in = _load("mm-function-registry-kb.yaml")["functions"]
    assert [f["function"] for f in functions] == [f["function"] for f in checked_in]
    assert mod.mine_supported_excel_functions(pages)["functions"] == _load("supported-excel-functions.yaml")["functions"]
