"""Local web UI (Streamlit) tying the whole pipeline together: upload a
workbook, run a mode, review findings, prep the workbook (apply the
changes you approve), ask the assistant about it or tell it what to
change, recalculate for real, download the reports. Launch via
run_excel_upload_prep.bat.

1.3.0: every workbook the UI hands back is written by Excel through COM and
re-opened by Excel to verify it loads (app/excel_com.py).
1.4.0: "Prep workbook" (app/prep.py) and "Ask the assistant" (app/chat_context.py).
1.5.0: the assistant proposes changes the user applies; context-aware titles.
1.5.1: restyled (sidebar workflow, status pills, cards) -- same behaviour.
"""
from __future__ import annotations

import html
import sys
import tempfile
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_ROOT))

import streamlit as st  # noqa: E402

from app.change_apply import convert_output_format  # noqa: E402
from app.chat_context import answer_question  # noqa: E402
from app.config import load_config  # noqa: E402
from app.excel_com import com_available  # noqa: E402
from app.excel_report import build_report_workbook, build_standalone_report  # noqa: E402
from app.inventory import has_vba_project  # noqa: E402
from app.llm import extract_formula, llm_available, suggest_formula_fix  # noqa: E402
from app.modes import fix_incompatible_formulas, plan_mode, prep_mind_loops, structure_fix  # noqa: E402
from app.progress import STAGE_TITLES, overall_progress  # noqa: E402
from app.sizing import MB, size_gate  # noqa: E402
from app.prep import apply_operations, formula_replacement_op, plan_actions  # noqa: E402
from app.recalc import recalculate  # noqa: E402
from app.rules_engine import RulesEngine  # noqa: E402

MODES = {
    "Plan (analyze everything)": plan_mode,
    "Prep Mind Loops": prep_mind_loops,
    "Fix Incompatible Formulas": fix_incompatible_formulas,
    "Structure Fix": structure_fix,
}

STATUS_STYLE = {
    "PASS": ("#0f6e3a", "#dff5e6"),
    "WARNING": ("#8a5a00", "#fff1cc"),
    "ERROR": ("#9f1d1d", "#fde2e2"),
    "REQUIRES_USER_INPUT": ("#7a3e00", "#ffe4c7"),
    "NOT_SUPPORTED": ("#4b5563", "#e9ecef"),
}
STATUS_LABEL = {
    "PASS": "Pass",
    "WARNING": "Warning",
    "ERROR": "Error",
    "REQUIRES_USER_INPUT": "Needs input",
    "NOT_SUPPORTED": "Not supported",
}
STATUS_ORDER = ["ERROR", "REQUIRES_USER_INPUT", "NOT_SUPPORTED", "WARNING", "PASS"]

MIME = {
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
}

FORMULA_RULES = ("FRM-002", "RSK-004", "FORMULA-002")
SECTIONS = ["Findings", "Prep workbook", "Ask the assistant", "Recalculate", "Reports"]

CSS = """
<style>
  #MainMenu, footer {visibility: hidden;}
  .block-container {padding-top: 3.2rem; padding-bottom: 3rem; max-width: 1280px;}
  h1, h2, h3 {letter-spacing: -0.01em;}
  .eup-title {font-size: 1.55rem; font-weight: 650; margin: 0 0 .15rem 0;}
  .eup-subtitle {color: #5f6b7a; font-size: .95rem; margin: 0 0 1rem 0;}
  .eup-pill {display: inline-block; padding: .18rem .6rem; border-radius: 999px; font-size: .78rem; font-weight: 600;
             letter-spacing: .02em; text-transform: uppercase; white-space: nowrap;}
  .eup-kpi {border: 1px solid #e5e7eb; border-radius: 10px; padding: .7rem .9rem; background: #fff;}
  .eup-kpi .n {font-size: 1.5rem; font-weight: 650; line-height: 1.1;}
  .eup-kpi .l {color: #5f6b7a; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em;}
  .eup-muted {color: #5f6b7a; font-size: .88rem;}
  .eup-file {font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85rem; word-break: break-all;}
  div[data-testid="stSidebar"] .block-container {padding-top: 1rem;}
  div[data-testid="stSidebar"] hr {margin: .6rem 0;}
  .stButton > button, .stDownloadButton > button {border-radius: 8px;}
  div[data-testid="stExpander"] details {border-radius: 10px;}
</style>
"""


# --- helpers -----------------------------------------------------------------------
@st.cache_resource
def get_engine() -> RulesEngine:
    return RulesEngine()


@st.cache_resource
def package_version() -> str:
    try:
        return (PACKAGE_ROOT / "VERSION").read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def get_work_dir() -> Path:
    if "work_dir" not in st.session_state:
        st.session_state.work_dir = Path(tempfile.mkdtemp(prefix="excel_upload_prep_"))
    return st.session_state.work_dir


def pill(status: str) -> str:
    fg, bg = STATUS_STYLE.get(status, ("#374151", "#e5e7eb"))
    return f'<span class="eup-pill" style="color:{fg};background:{bg};">{html.escape(STATUS_LABEL.get(status, status))}</span>'


def kpi(label: str, value, status: str | None = None) -> str:
    fg = STATUS_STYLE.get(status or "", ("#111827", ""))[0]
    return f'<div class="eup-kpi"><div class="n" style="color:{fg}">{html.escape(str(value))}</div><div class="l">{html.escape(label)}</div></div>'


def _download(label: str, path: Path, key: str) -> None:
    st.download_button(
        label,
        data=Path(path).read_bytes(),
        file_name=Path(path).name,
        mime=MIME.get(Path(path).suffix.lower(), "application/octet-stream"),
        key=key,
    )


def _location_text(location: dict) -> str:
    if not location:
        return ""
    if "sheet" in location and "cell" in location:
        return f"{location['sheet']}!{location['cell']}"
    return ", ".join(f"{k}={v}" for k, v in location.items())


def run_analysis(source_path: Path, mode_key: str, ignore_sheets: list[str] | None = None) -> None:
    config = load_config()
    engine = get_engine()
    module = MODES[mode_key]
    # 1.6.6: a live status indicator -- stage, sheet or rule being worked on, overall progress
    with st.status(f"Running {mode_key}...", expanded=True) as status:
        bar = st.progress(0.0, text="Starting")

        def progress(stage: str, message: str, fraction: float | None = None, **facts) -> None:
            bar.progress(overall_progress(stage, fraction, False), text=f"{STAGE_TITLES.get(stage, stage)} - {message}")

        result = module.run(source_path, get_work_dir() / "analysis", config, engine=engine, ignore_sheets=ignore_sheets or None, progress=progress)
        bar.progress(1.0, text="Done")
        skipped = f" ({len(ignore_sheets)} sheet(s) skipped)" if ignore_sheets else ""
        status.update(label=f"{mode_key}: done{skipped}", state="complete", expanded=False)
    st.session_state.result = result
    st.session_state.analyzed_path = source_path
    st.session_state.last_mode_key = mode_key
    st.session_state.action_results = {}  # stale fix/suggestion results no longer apply
    st.session_state.prep_plan = plan_actions(result["workbook_analysis"], result["validation_report"])
    for key in ("report_builds", "prep_result", "formula_apply_result", "suggestion_text", "pending_proposal"):
        st.session_state.pop(key, None)
    st.session_state.setdefault("chat_history", [])
    st.session_state.chat_history.append(
        {"role": "assistant", "content": f"Analyzed **{source_path.name}** ({mode_key}): overall {result['validation_report']['status']}, {result['validation_report']['summary']['status_counts']}. Ask me anything about it, or tell me what to change.", "_note": True}
    )


# --- sidebar ------------------------------------------------------------------------
def render_sidebar() -> None:
    with st.sidebar:
        st.markdown('<div class="eup-title">Excel Upload Preparation</div><div class="eup-subtitle">Milliman Mind readiness</div>', unsafe_allow_html=True)
        uploaded = st.file_uploader("Workbook", type=["xlsx", "xlsm", "xlsb"], help="Your original file is never modified; every step runs on a fresh copy.")
        mode_key = st.selectbox("Analysis mode", list(MODES))
        # 1.6.6: size gate -- above the (decompressed) threshold, offer to skip sheets before scanning
        ignore_sheets: list[str] = []
        if uploaded is not None:
            gate_key = (uploaded.name, uploaded.size)
            if st.session_state.get("gate_key") != gate_key:
                gate_path = get_work_dir() / "gate" / uploaded.name
                gate_path.parent.mkdir(parents=True, exist_ok=True)
                gate_path.write_bytes(uploaded.getvalue())
                st.session_state.gate_key = gate_key
                st.session_state.gate = size_gate(gate_path, load_config())
            gate = st.session_state.gate
            if gate["above_threshold"]:
                st.warning(gate["message"])
                names = [sh["name"] for sh in gate["sheets"]]
                sizes = {sh["name"]: sh["bytes"] for sh in gate["sheets"]}
                if names:
                    ignore_sheets = st.multiselect(
                        "Sheets to skip (optional)",
                        names,
                        format_func=lambda n: f"{n} · {sizes.get(n, 0) / MB:.1f} MB",
                        help="Skipped sheets are not read or checked by any rule; they stay in the file untouched.",
                    )
                    if len(ignore_sheets) >= len(names):
                        st.error("At least one sheet must be scanned.")
                        ignore_sheets = []
        if st.button("Run analysis", type="primary", use_container_width=True, disabled=uploaded is None):
            work_dir = get_work_dir()
            raw_path = work_dir / uploaded.name
            raw_path.write_bytes(uploaded.getvalue())
            source_path = raw_path
            if raw_path.suffix.lower() == ".xlsb":
                target = "xlsm" if has_vba_project(raw_path) else "xlsx"
                with st.spinner(f"Converting .xlsb to .{target} via Excel (openpyxl can't read .xlsb)..."):
                    conv = convert_output_format(raw_path, work_dir / "convert", target)
                if conv["status"] != "APPLIED":
                    st.error(conv.get("message", "Conversion failed."))
                    st.stop()
                source_path = conv["output_path"]
                st.success(f"Converted to {source_path.name}")
            st.session_state.chat_history = []
            run_analysis(source_path, mode_key, ignore_sheets)

        if "result" in st.session_state:
            st.divider()
            rep = st.session_state.result["validation_report"]
            feats = st.session_state.result["workbook_analysis"]["features"]
            st.markdown("**Current file**")
            st.markdown(f'<div class="eup-file">{html.escape(Path(st.session_state.analyzed_path).name)}</div>', unsafe_allow_html=True)
            st.markdown(pill(rep["status"]), unsafe_allow_html=True)
            st.markdown(
                f'<div class="eup-muted">{feats.get("sheet_count")} sheets · {feats.get("grid_count")} grids · {feats.get("formula_count")} formulas · '
                f'{len(feats.get("mm_functions_used", {}))} MM_ functions</div>',
                unsafe_allow_html=True,
            )
            st.markdown(f'<div class="eup-muted">Mode: {html.escape(st.session_state.get("last_mode_key", ""))}</div>', unsafe_allow_html=True)

        st.divider()
        st.markdown(
            f'<div class="eup-muted">Version {html.escape(package_version())}<br>'
            f'Excel automation: {"available" if com_available() else "not available"}<br>'
            f'Assistant: {"configured" if llm_available() else "not configured"}<br><br>'
            "The original file is never modified. PASS is only reported after a real recalculation.</div>",
            unsafe_allow_html=True,
        )


# --- findings -------------------------------------------------------------------
def render_findings(result: dict) -> None:
    report = result["validation_report"]
    status = report["status"]
    counts = report["summary"]["status_counts"]

    head1, head2 = st.columns([0.6, 0.4])
    with head1:
        st.markdown(f"#### Overall status &nbsp; {pill(status)}", unsafe_allow_html=True)
        if status != "PASS":
            st.markdown('<div class="eup-muted">PASS requires a clean recalculation -- use Recalculate after applying changes.</div>', unsafe_allow_html=True)
    with head2:
        st.markdown(f'<div class="eup-muted" style="text-align:right">{report["summary"]["finding_count"]} rules evaluated · every active rule has a real validator</div>', unsafe_allow_html=True)

    cols = st.columns(len(STATUS_ORDER))
    for col, s in zip(cols, STATUS_ORDER):
        col.markdown(kpi(STATUS_LABEL[s], counts.get(s, 0), s), unsafe_allow_html=True)

    st.write("")
    findings = report["findings"]
    status_filter = st.multiselect("Show", options=STATUS_ORDER, default=["ERROR", "REQUIRES_USER_INPUT", "WARNING"], format_func=lambda s: STATUS_LABEL[s])
    shown = [f for f in findings if f["status"] in status_filter] if status_filter else findings
    st.dataframe(
        [{"Rule": f["rule_id"], "Severity": f.get("severity", ""), "Status": STATUS_LABEL.get(f["status"], f["status"]), "Location": _location_text(f.get("location") or {}), "Finding": f["message"]} for f in shown],
        use_container_width=True,
        hide_index=True,
        column_config={
            "Rule": st.column_config.TextColumn(width="small"),
            "Severity": st.column_config.TextColumn(width="small"),
            "Status": st.column_config.TextColumn(width="small"),
            "Location": st.column_config.TextColumn(width="medium"),
            "Finding": st.column_config.TextColumn(width="large"),
        },
    )


# --- prep workbook ---------------------------------------------------------------
def _show_output_result(result: dict, key_prefix: str) -> None:
    if result["status"] in ("APPLIED", "PARTIAL"):
        output_path = Path(result["output_path"])
        with st.container(border=True):
            st.markdown(f"**{'Applied' if result['status'] == 'APPLIED' else 'Partially applied'}** -- {result.get('message', '')}")
            st.markdown(f'<div class="eup-file">{html.escape(output_path.name)}</div>', unsafe_allow_html=True)
            verified = result.get("verified_opens_in_excel")
            if verified is True:
                st.markdown('<div class="eup-muted">Written by Excel and verified to open in Excel.</div>', unsafe_allow_html=True)
            elif verified is False:
                st.error("Excel could not re-open the output -- do not upload this file.")
            for w in result.get("warnings", []):
                st.warning(w)
            if result.get("failed"):
                st.warning(f"{len(result['failed'])} operation(s) failed")
                st.dataframe([{"Sheet": o["sheet"], "Target": o.get("cell") or o.get("row") or o.get("after"), "Error": o["error"]} for o in result["failed"]], use_container_width=True, hide_index=True)
            st.session_state.analyzed_path = output_path
            c1, c2 = st.columns(2)
            with c1:
                _download("Download prepared workbook", output_path, key=f"{key_prefix}_download")
            with c2:
                if st.button("Re-analyze the prepared file", key=f"{key_prefix}_reanalyze", use_container_width=True):
                    run_analysis(output_path, st.session_state.get("last_mode_key", "Plan (analyze everything)"))
                    st.rerun()
    elif result["status"] == "NOT_APPLICABLE":
        st.info(result["message"])
    else:
        st.error(result.get("message", "Apply failed."))


def render_prep(result: dict) -> None:
    st.markdown("#### Prep workbook")
    st.markdown(
        '<div class="eup-muted">Each change is planned from the findings and listed cell by cell. Select what you approve and apply: '
        "Excel writes the changes to a fresh copy of the analyzed file, the copy is verified to open, and a change log is written next to it.</div>",
        unsafe_allow_html=True,
    )
    st.write("")
    plan = st.session_state.get("prep_plan") or []
    total = sum(a["count"] for a in plan)
    if total == 0:
        st.info("Nothing to prepare automatically for this workbook -- the remaining findings need a manual decision (the assistant can explain or make specific changes).")
    selected_ops = []
    for a in plan:
        if a["count"] == 0 and not a["skipped"]:
            continue
        with st.container(border=True):
            col1, col2 = st.columns([0.05, 0.95])
            checked = col1.checkbox("", value=a["default_on"] and a["count"] > 0, key=f"prep_{a['id']}", disabled=a["count"] == 0, label_visibility="collapsed")
            with col2:
                st.markdown(f"**{a['title']}**  \n<span class='eup-muted'>{a['count']} change(s) · rules {', '.join(a['rule_ids'])}</span>", unsafe_allow_html=True)
                with st.expander("Details", expanded=False):
                    if a["operations"]:
                        st.dataframe(
                            [{"Sheet": o["sheet"], "Target": o.get("cell") or (f"row {o['row']}" if "row" in o else o.get("before")), "Before": str(o.get("before"))[:120], "After": str(o.get("after"))[:120], "Note": o.get("note", "")} for o in a["operations"][:300]],
                            use_container_width=True,
                            hide_index=True,
                        )
                    for skip in a["skipped"]:
                        st.markdown(f'<div class="eup-muted">Skipped: {html.escape(skip)}</div>', unsafe_allow_html=True)
        if checked:
            selected_ops.extend(a["operations"])
    if total:
        if not com_available():
            st.warning("Excel automation is not available: structural changes (renames, row inserts, colours, protection) will be refused and the copy is written without Excel.")
        if st.button(f"Apply {len(selected_ops)} selected change(s)", type="primary", disabled=not selected_ops, key="prep_apply"):
            with st.spinner("Applying through Excel and verifying the result..."):
                st.session_state.prep_result = apply_operations(st.session_state.analyzed_path, get_work_dir() / "prep", selected_ops)
            # no st.rerun(): the click already reruns the script
    if st.session_state.get("prep_result"):
        _show_output_result(st.session_state.prep_result, "prep")

    _render_formula_replacement(result)


def _render_formula_replacement(result: dict) -> None:
    findings = {f["rule_id"]: f for f in result["validation_report"]["findings"]}
    sites = []
    for rid in FORMULA_RULES:
        f = findings.get(rid)
        if not f or f["status"] == "PASS":
            continue
        obs = f.get("observed") or {}
        for s in obs.get("call_sites", []):
            sites.append({"rule_id": rid, "sheet": s["sheet"], "cell": s["cell"], "formula": s["formula"], "functions": s.get("functions", [])})
        if rid == "RSK-004":
            for ref in obs.get("let_formula_cells", [])[:20]:
                sheet, cell = ref.split("!", 1)
                formula = next((x["formula"] for x in result["workbook_analysis"]["workbooks"][0]["formulas"] if x["sheet"] == sheet and x["cell"] == cell), "")
                sites.append({"rule_id": rid, "sheet": sheet, "cell": cell, "formula": formula, "functions": ["LET"]})
    if not sites:
        return
    st.write("")
    st.markdown("#### Replace an incompatible formula")
    st.markdown('<div class="eup-muted">Pick a flagged formula, optionally ask for a suggestion, edit the replacement yourself, then apply. Nothing is written until you click Apply.</div>', unsafe_allow_html=True)
    with st.container(border=True):
        labels = [f"{s['rule_id']} · {s['sheet']}!{s['cell']} · {', '.join(s['functions'])}" for s in sites]
        idx = st.selectbox("Flagged formula", range(len(sites)), format_func=lambda i: labels[i], key="formula_site")
        site = sites[idx]
        st.code(site["formula"], language="text")
        col1, col2 = st.columns([0.3, 0.7])
        if col1.button("Suggest a fix", key="formula_suggest", disabled=not llm_available(), use_container_width=True):
            with st.spinner("Asking for a suggestion..."):
                s = suggest_formula_fix(findings[site["rule_id"]], site["formula"])
            st.session_state.suggestion_text = s.get("suggestion") or s.get("message")
            st.session_state.formula_draft = extract_formula(s.get("suggestion")) or ""
        if st.session_state.get("suggestion_text"):
            col2.info(st.session_state.suggestion_text)
        draft = st.text_area("Replacement formula (must start with '=')", value=st.session_state.get("formula_draft", ""), key="formula_replacement_text")
        if st.button("Apply this formula to the cell", key="formula_apply", disabled=not draft.strip().startswith("=")):
            try:
                op = formula_replacement_op(site["sheet"], site["cell"], site["formula"], draft, site["rule_id"])
            except ValueError as exc:
                st.error(str(exc))
                return
            with st.spinner("Writing the formula through Excel..."):
                st.session_state.formula_apply_result = apply_operations(st.session_state.analyzed_path, get_work_dir() / "formula_fix", [op])
    if st.session_state.get("formula_apply_result"):
        _show_output_result(st.session_state.formula_apply_result, "formula")


# --- chat ---------------------------------------------------------------------------
def _render_proposal(result: dict) -> None:
    """The assistant's pending change proposal: before/after table + Apply."""
    proposal = st.session_state.get("pending_proposal")
    if not proposal:
        return
    ops = proposal["ops"]
    with st.container(border=True):
        st.markdown(f"**Proposed change** -- {html.escape(proposal.get('summary') or '')} <span class='eup-muted'>({len(ops)} operation(s))</span>", unsafe_allow_html=True)
        st.dataframe(
            [{"Op": o["op"], "Sheet": o["sheet"], "Target": o.get("cell") or (f"row {o['row']}" if "row" in o else f"column {o['column']}" if "column" in o else ""), "Before": str(o.get("before"))[:100], "After": str(o.get("after"))[:100]} for o in ops],
            use_container_width=True,
            hide_index=True,
        )
        col1, col2 = st.columns([0.25, 0.75])
        if col1.button(f"Apply {len(ops)} change(s)", type="primary", key="proposal_apply", use_container_width=True):
            with st.spinner("Applying through Excel, verifying, re-analyzing..."):
                outcome = apply_operations(st.session_state.analyzed_path, get_work_dir() / "chat", ops)
            st.session_state.pop("pending_proposal", None)
            st.session_state.chat_apply_result = outcome
            if outcome["status"] in ("APPLIED", "PARTIAL"):
                run_analysis(Path(outcome["output_path"]), st.session_state.get("last_mode_key", "Plan (analyze everything)"))
                failed = f"; {len(outcome['failed'])} failed: " + "; ".join(f["error"] for f in outcome["failed"][:3]) if outcome.get("failed") else ""
                st.session_state.chat_history.append({"role": "assistant", "content": f"Applied {len(outcome['applied'])} change(s) via {outcome['method']} (opens in Excel: {outcome.get('verified_opens_in_excel')}){failed}. The workbook was re-analyzed; new findings are in the context now.", "_note": True})
            else:
                st.session_state.chat_history.append({"role": "assistant", "content": f"The change could not be applied: {outcome.get('message')}", "_note": True})
            st.rerun()
        if col2.button("Discard", key="proposal_discard"):
            st.session_state.pop("pending_proposal", None)
            st.rerun()


def render_chat(result: dict) -> None:
    st.markdown("#### Ask the assistant")
    if not llm_available():
        st.info("The assistant needs the shared Milliman gateway key (secret.key / config.enc nearby); it isn't configured on this machine.")
        return
    st.markdown(
        '<div class="eup-muted">Grounded in this workbook\'s analysis and findings. Ask questions, or tell it to change anything: it proposes the exact cell changes, '
        "you click Apply, Excel writes them to a fresh copy, the file is verified and re-analyzed so the conversation continues on the changed workbook.</div>",
        unsafe_allow_html=True,
    )
    history = st.session_state.setdefault("chat_history", [])
    top1, top2 = st.columns([0.8, 0.2])
    if top2.button("Clear conversation", key="chat_clear", use_container_width=True):
        st.session_state.chat_history = []
        st.session_state.pop("pending_proposal", None)
        st.rerun()
    for m in history:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])
    if st.session_state.get("chat_apply_result"):
        r = st.session_state.chat_apply_result
        if r["status"] in ("APPLIED", "PARTIAL"):
            out = Path(r["output_path"])
            with st.container(border=True):
                st.markdown(f"**{r['status'].capitalize()}** -- {r['message']}" + (" · verified to open in Excel" if r.get("verified_opens_in_excel") else ""))
                st.markdown(f'<div class="eup-file">{html.escape(out.name)}</div>', unsafe_allow_html=True)
                for w in r.get("warnings", []):
                    st.warning(w)
                if out.is_file():
                    _download("Download the changed workbook", out, key="chat_download")
        else:
            st.error(r.get("message", "Apply failed."))
    _render_proposal(result)
    question = st.chat_input("Ask anything, or tell me what to change -- e.g. 'rename sheet Notes to Inputs', 'title the grid at B4 #Premiums /Input', 'why does RES-002 fail?'")
    if question:
        history.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                reply = answer_question(history[:-1], question, result["workbook_analysis"], result["validation_report"], st.session_state.get("prep_plan"))
            text = reply["text"] or f"(no answer: {reply['message']})"
            st.markdown(text)
            for e in reply.get("proposal_errors", []):
                st.warning(f"Proposal problem: {e}")
            st.caption(f"context {reply.get('context_chars', 0)} chars + detail {reply.get('detail_chars', 0)} chars" + (f" + {reply['lookups']} lookup(s)" if reply.get("lookups") else ""))
        history.append({"role": "assistant", "content": text})
        if reply.get("proposal"):
            st.session_state.pending_proposal = {"ops": reply["proposal"], "summary": reply.get("proposal_summary")}
            st.rerun()


# --- recalculation / reports ----------------------------------------------------------------
def render_recalculate() -> None:
    st.markdown("#### Recalculate")
    st.markdown('<div class="eup-muted">Drives your installed Excel (hidden, macros force-disabled) to recalculate a fresh copy and checks for formula errors -- the only way this app claims PASS.</div>', unsafe_allow_html=True)
    st.write("")
    if st.button("Recalculate now", type="primary"):
        with st.spinner("Opening Excel and recalculating (this can take a while on large workbooks)..."):
            result = recalculate(st.session_state.analyzed_path)
        st.session_state.recalc_result = result
    result = st.session_state.get("recalc_result")
    if result:
        with st.container(border=True):
            st.markdown(f"{pill(result['status'])} &nbsp; {html.escape(result['message'])}", unsafe_allow_html=True)
            if result.get("formula_errors"):
                st.dataframe(result["formula_errors"], use_container_width=True, hide_index=True)
            if result.get("addin_gap_errors"):
                st.warning(f"{len(result['addin_gap_errors'])} cell(s) show #NAME? because the MMForExcel add-in isn't installed on this machine's Excel -- not a workbook defect.")
                st.dataframe(result["addin_gap_errors"], use_container_width=True, hide_index=True)


def render_download_report() -> None:
    st.markdown("#### Reports")
    st.markdown(
        '<div class="eup-muted"><b>Standalone report</b> (.xlsx, Summary + Findings) is always a fresh, valid file. '
        "<b>Workbook copy + report sheets</b> is your workbook written by Excel itself with the report appended, then re-opened by Excel to verify it loads.</div>",
        unsafe_allow_html=True,
    )
    st.write("")
    if not com_available():
        st.warning("Excel automation is not available on this machine: the workbook copy will be written without Excel (reduced fidelity).")
    if st.button("Generate reports", type="primary"):
        with st.spinner("Building reports (Excel opens your workbook in the background)..."):
            analysis = st.session_state.result["workbook_analysis"]
            report = st.session_state.result["validation_report"]
            copy_path = Path(analysis["source"]["copy_path"])
            source_name = Path(st.session_state.analyzed_path).name
            suffix = Path(st.session_state.analyzed_path).suffix
            stem = Path(source_name).stem
            standalone = build_standalone_report(report, get_work_dir() / f"{stem}_mind_readiness_report.xlsx", rules_by_id=get_engine().rules, source_name=source_name)
            built = build_report_workbook(copy_path, report, get_work_dir() / f"{stem}_with_report{suffix}", rules_by_id=get_engine().rules, source_name=source_name)
        st.session_state.report_builds = {"standalone": standalone, "workbook": built}

    builds = st.session_state.get("report_builds")
    if not builds:
        return
    standalone = Path(builds["standalone"])
    built = builds["workbook"]
    col1, col2 = st.columns(2)
    with col1, st.container(border=True):
        st.markdown("**Standalone report**")
        st.markdown(f'<div class="eup-file">{html.escape(standalone.name)}</div>', unsafe_allow_html=True)
        if standalone.is_file():
            _download("Download standalone report (.xlsx)", standalone, key="download_standalone")
    with col2, st.container(border=True):
        st.markdown("**Workbook copy + report sheets**")
        st.markdown(f'<div class="eup-file">{html.escape(Path(built.path).name)}</div>', unsafe_allow_html=True)
        if built.verified_opens_in_excel is True:
            st.markdown(f'<div class="eup-muted">Written by Excel ({built.method}) and verified to open in Excel.</div>', unsafe_allow_html=True)
        elif built.verified_opens_in_excel is False:
            st.error("Excel could not re-open this file -- use the standalone report instead.")
        else:
            st.markdown(f'<div class="eup-muted">Written with {built.method}; not verified (Excel unavailable).</div>', unsafe_allow_html=True)
        for w in built.warnings:
            st.warning(w)
        if Path(built.path).is_file() and built.verified_opens_in_excel is not False:
            _download("Download workbook copy with report", Path(built.path), key="download_workbook_report")


# --- main ------------------------------------------------------------------------------
def _section_switcher() -> str:
    # A control with a session key keeps its selection across reruns; st.tabs
    # snaps back to the first tab after every rerun (e.g. after a long Excel
    # apply), hiding the result the user just produced.
    if hasattr(st, "segmented_control"):
        choice = st.segmented_control("Section", SECTIONS, key="section", default="Findings", label_visibility="collapsed")
        return choice or "Findings"
    return st.radio("Section", SECTIONS, horizontal=True, key="section", label_visibility="collapsed")


def main() -> None:
    st.set_page_config(page_title="Excel Upload Preparation -- Milliman Mind", page_icon="📊", layout="wide", initial_sidebar_state="expanded")
    st.markdown(CSS, unsafe_allow_html=True)
    render_sidebar()

    if "result" not in st.session_state:
        st.markdown('<div class="eup-title">Milliman Mind -- Excel Upload Preparation</div>', unsafe_allow_html=True)
        st.markdown(
            '<div class="eup-subtitle">Upload a workbook in the sidebar and run the analysis. You will get the readiness findings, '
            "a list of concrete changes you can apply, an assistant that answers questions and makes changes on request, "
            "a real Excel recalculation, and downloadable reports.</div>",
            unsafe_allow_html=True,
        )
        c1, c2, c3 = st.columns(3)
        c1.markdown(kpi("Readiness rules", len(get_engine().active_rules())), unsafe_allow_html=True)
        c2.markdown(kpi("Original file", "never modified"), unsafe_allow_html=True)
        c3.markdown(kpi("Outputs", "written by Excel, verified"), unsafe_allow_html=True)
        return

    result = st.session_state.result
    st.markdown(f'<div class="eup-title">{html.escape(Path(st.session_state.analyzed_path).name)}</div>', unsafe_allow_html=True)
    section = _section_switcher()
    st.divider()
    if section == "Findings":
        render_findings(result)
    elif section == "Prep workbook":
        render_prep(result)
    elif section == "Ask the assistant":
        render_chat(result)
    elif section == "Recalculate":
        render_recalculate()
    else:
        render_download_report()


if __name__ == "__main__":
    main()
