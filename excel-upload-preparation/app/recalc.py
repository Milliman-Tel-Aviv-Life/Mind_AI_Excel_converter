"""Real recalculation adapter (CLAUDE_CODE_PROMPT.md phase 9): drives the
locally-installed Excel via win32com to recalculate a copy of the workbook.
Setting calculation flags or saving through openpyxl is explicitly NOT a
valid recalculation per excel/recalculation.md -- this is the trusted
adapter that actually is one.

Never runs macros: AutomationSecurity is forced to msoAutomationSecurityForceDisable
before opening, per instructions/core.md ("never execute VBA... during inspection").
Always operates on a copy, never the user's original file.

1.6.2: built on app/excel_com.py's `excel_session` like every other Excel
path in the app, with every COM proxy scoped inside an inner function. The
previous hand-rolled lifecycle released Range/Worksheet proxies *after*
`CoUninitialize`, which poisoned the apartment for a later session in the
same process: a recalculation following an Excel apply failed with
"The interface is unknown" (RPC_S_UNKNOWN_IF). Results carry `ran` so a
run that could not happen is never mistaken for a clean one.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .excel_com import close_quietly, com_available, excel_session, open_workbook
from .formula_utils import called_functions, mask_strings

# Excel COM's Range.Value returns error cells as these negative integer xlErr*
# constants, never as the display string -- confirmed empirically (Range.Text
# gives the string but only works cell-by-cell, not for a bulk range read).
XL_ERROR_CODES = {
    -2146826281: "#DIV/0!",
    -2146826246: "#N/A",
    -2146826259: "#NAME?",
    -2146826288: "#NULL!",
    -2146826252: "#NUM!",
    -2146826265: "#REF!",
    -2146826273: "#VALUE!",
}
MSO_AUTOMATION_SECURITY_FORCE_DISABLE = 3
ADDIN_NAME_MARKERS = ("mmforexcel", "milliman", "mind")


def _mmforexcel_loaded(excel) -> bool:
    """Best-effort check for a loaded Mind/MMForExcel add-in. Checked
    empirically on this machine: no such add-in is registered at all (only
    stock Office add-ins show up in COMAddIns/AddIns), which is exactly the
    gap this function exists to detect -- MM_ functions genuinely can't be
    evaluated by Excel without it, so a #NAME? on an MM_ call is not the
    same kind of finding as one on a native formula."""
    try:
        for i in range(1, excel.COMAddIns.Count + 1):
            addin = excel.COMAddIns.Item(i)
            text = f"{addin.ProgId} {addin.Description}".lower()
            if addin.Connect and any(marker in text for marker in ADDIN_NAME_MARKERS):
                return True
    except Exception:
        pass
    try:
        for i in range(1, excel.AddIns.Count + 1):
            addin = excel.AddIns.Item(i)
            if addin.Installed and any(marker in addin.Name.lower() for marker in ADDIN_NAME_MARKERS):
                return True
    except Exception:
        pass
    return False


def _not_run(status: str, message: str) -> dict[str, Any]:
    return {"status": status, "message": message, "formula_errors": [], "addin_gap_errors": [], "ran": False, "mmforexcel_loaded": False}


def _scan(excel, copy_path: Path) -> dict[str, Any]:
    """Open, fully rebuild, save, and scan every used range for error values.
    Every COM proxy lives inside this function so it is released before the
    session quits Excel."""
    mmforexcel_loaded = _mmforexcel_loaded(excel)
    wb = None
    try:
        wb = open_workbook(excel, copy_path, read_only=False)
        excel.CalculateFullRebuild()
        wb.Save()

        formula_errors: list[dict[str, Any]] = []
        addin_gap_errors: list[dict[str, Any]] = []
        for sheet in wb.Worksheets:
            used_range = sheet.UsedRange
            values = used_range.Value
            formulas = used_range.Formula
            if values is None:
                continue
            # Excel COM returns a scalar for a 1x1 range, a tuple-of-tuples otherwise.
            if not isinstance(values, tuple):
                values = ((values,),)
                formulas = ((formulas,),)
            top_row = used_range.Row
            top_col = used_range.Column
            sheet_name = sheet.Name
            for r_idx, row in enumerate(values):
                for c_idx, val in enumerate(row):
                    error_text = XL_ERROR_CODES.get(val) if isinstance(val, int) else None
                    if error_text is None:
                        continue
                    formula_text = formulas[r_idx][c_idx]
                    if isinstance(formula_text, str) and formula_text.startswith("="):
                        cell = sheet.Cells(top_row + r_idx, top_col + c_idx)
                        # Dynamic COM dispatch (no gencache) resolves .Address as a
                        # no-arg property, not a callable -- strip the '$' ourselves
                        # instead of calling Address(False, False).
                        address = cell.Address.replace("$", "")
                        array_addr = None
                        if cell.HasArray:
                            arr = cell.CurrentArray
                            array_addr = str(arr.Address).replace("$", "")
                            arr = None
                        cell = None
                        entry = {"sheet": sheet_name, "cell": address, "error": error_text, "formula": formula_text}
                        if array_addr and ":" in array_addr:
                            entry["array"] = array_addr  # multi-cell array formula: can only be changed as a whole
                        is_mm_call = "MM_" in formula_text.upper()
                        if error_text == "#NAME?" and is_mm_call and not mmforexcel_loaded:
                            addin_gap_errors.append(entry)
                        else:
                            formula_errors.append(entry)
            used_range = None
            sheet = None
    finally:
        close_quietly(wb)
        wb = None

    if formula_errors:
        status = "ERROR"
        message = f"Recalculated; {len(formula_errors)} genuine formula error cell(s) found."
    elif addin_gap_errors:
        status = "NOT_SUPPORTED"
        message = (
            f"Recalculated, but {len(addin_gap_errors)} MM_ function call(s) show #NAME? because "
            "the MMForExcel add-in is not installed/loaded on this Excel automation instance "
            "(checked COMAddIns/AddIns; none found) -- Mind's own MM_001 rule expects this add-in "
            "whenever MM functions exist. This is not a workbook defect; it can't be verified as "
            "PASS or ERROR without MMForExcel installed here."
        )
    else:
        status = "PASS"
        message = "Recalculated successfully; no formula errors found."
    return {
        "status": status,
        "message": message,
        "formula_errors": formula_errors,
        "addin_gap_errors": addin_gap_errors,
        "ran": True,
        "mmforexcel_loaded": mmforexcel_loaded,
    }


# --- root-cause grouping (1.6.3) -------------------------------------------------
_REF_TOKEN_RE = re.compile(r"(?:(?:'[^']+'|[A-Za-z0-9_.]+)!)?\$?[A-Za-z]{1,3}\$?\d{1,7}(?::\$?[A-Za-z]{1,3}\$?\d{1,7})?")
_NUMBER_RE = re.compile(r"(?<![A-Za-z_])\d+(?:\.\d+)?")


def formula_signature(formula: str) -> str:
    """The *shape* of a formula: references -> REF, string literals -> "…",
    numeric constants -> N, whitespace removed, upper-cased. Two cells whose
    formulas share a signature almost always share a root cause."""
    if not formula:
        return ""
    masked = mask_strings(formula)
    sig = _REF_TOKEN_RE.sub("REF", masked)
    sig = re.sub(r'"[^"]*"', '"…"', sig)
    sig = _NUMBER_RE.sub("N", sig)
    return re.sub(r"\s+", "", sig).upper()


def _unknown_functions(formula: str) -> list[str]:
    from .validators.excel_functions import EXCEL_FUNCTIONS

    return sorted({fn for fn in called_functions(formula) if fn not in EXCEL_FUNCTIONS and not fn.startswith("MM_")})


def group_errors(formula_errors: list[dict[str, Any]], addin_gap_errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Cluster recalculation errors by root cause so the UI can offer 'fix all':
    #NAME? from the same unknown function(s); any error from formulas of the
    same shape; add-in-gap #NAME? by the MM_ function(s) involved."""
    groups: dict[tuple[str, str], dict[str, Any]] = {}

    def _add(key: tuple[str, str], cause: str, kind: str, entry: dict[str, Any]) -> None:
        g = groups.setdefault(key, {"error": key[0], "cause": cause, "kind": kind, "signature": key[1], "cells": []})
        c = {"sheet": entry.get("sheet", ""), "cell": entry.get("cell", ""), "formula": entry.get("formula", ""), "error": entry.get("error", key[0])}
        if entry.get("array"):
            c["array"] = entry["array"]
        g["cells"].append(c)

    for e in formula_errors:
        formula = str(e.get("formula") or "")
        error = str(e.get("error") or "")
        unknown = _unknown_functions(formula) if error == "#NAME?" else []
        if unknown:
            _add((error, "fn:" + ",".join(unknown)), f"#NAME? -- unknown function(s) {', '.join(unknown)} (not an Excel or MM_ function; VBA/add-in or typo)", "formula", e)
        else:
            sig = formula_signature(formula)
            _add((error, "sig:" + sig), f"{error} in formulas of the form {sig or '(empty)'}", "formula", e)
    for e in addin_gap_errors:
        formula = str(e.get("formula") or "")
        mm = sorted({fn for fn in called_functions(formula) if fn.startswith("MM_")})
        _add(("#NAME?", "mm:" + ",".join(mm)), f"#NAME? because {', '.join(mm) or 'an MM_ function'} needs the MMForExcel add-in -- an environment gap on this machine, not a workbook defect", "addin_gap", {**e, "error": "#NAME?"})

    out = []
    for i, g in enumerate(sorted(groups.values(), key=lambda g: (-len(g["cells"]), g["error"], g["signature"]))):
        arrays = sorted({f"{c['sheet']}!{c['array']}" for c in g["cells"] if c.get("array")})
        if arrays:
            g["arrays"] = arrays
            g["cause"] += f" -- array formula {', '.join(arrays[:4])}{' ...' if len(arrays) > 4 else ''} (Ctrl+Shift+Enter; it can only be changed as a whole)"
        out.append({"id": f"g{i + 1}", **g, "count": len(g["cells"])})
    return out


def recalculate(copy_path: Path) -> dict[str, Any]:
    """Recalculates `copy_path` in place (it's already a disposable copy)
    and reports any formula-error cells found afterward."""
    if not com_available():
        return _not_run("NOT_SUPPORTED", "pywin32 is not available in this environment; Excel COM recalculation cannot run here.")
    copy_path = Path(copy_path).resolve()
    if not copy_path.is_file():
        return _not_run("ERROR", f"file not found: {copy_path}")
    try:
        with excel_session() as excel:
            return _scan(excel, copy_path)
    except Exception as exc:  # pragma: no cover -- requires a real Excel install to exercise
        return _not_run("ERROR", f"Excel COM recalculation failed: {exc}")
