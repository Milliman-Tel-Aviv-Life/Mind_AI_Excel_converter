import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { PrepAction, ApplyResult } from "../types";
import * as api from "../services/api";
import OperationsTable from "../components/OperationsTable";

function ActionCard({
  action,
  checked,
  onChange,
}: {
  action: PrepAction;
  checked: boolean;
  onChange: (id: string, checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border rounded-xl bg-white transition-colors ${checked ? "border-[#1F3A5F]" : "border-[#E5E7EB]"}`}>
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(action.id, e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#1F3A5F] cursor-pointer flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[13px] text-[#111827]">{action.title}</span>
            <span className="text-[11px] text-[#6B7280] font-mono bg-[#F3F4F6] px-1.5 py-0.5 rounded">
              {action.count} change{action.count !== 1 ? "s" : ""}
            </span>
            {action.rule_ids.map((r) => (
              <span key={r} className="text-[11px] font-mono text-[#1F3A5F] bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                {r}
              </span>
            ))}
          </div>
          {!action.default_on && (
            <div className="text-[12px] text-[#8A5A00] bg-[#FFF1CC] border border-[#8A5A00]/20 rounded px-2 py-0.5 inline-block mt-1.5">
              Off by default
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[12px] text-[#6B7280] hover:text-[#374151] flex-shrink-0"
        >
          {expanded ? "Hide" : "Show"} operations ↓
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#F3F4F6]">
          <div className="pt-3">
            <OperationsTable operations={action.operations} compact />
          </div>
          {action.skipped.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-2">SKIPPED</div>
              <div className="flex flex-col gap-1">
                {action.skipped.map((s, i) => (
                  <div key={i} className="text-[12px] text-[#8A5A00] font-mono bg-[#FFF1CC] border border-[#8A5A00]/15 rounded px-2 py-1">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, sessionId, onReanalyze, reanalyzing }: { result: ApplyResult; sessionId: string; onReanalyze: () => void; reanalyzing: boolean }) {
  return (
    <div className={`border rounded-xl p-5 ${
      result.status === "APPLIED"
        ? "border-[#0F766E]/30 bg-[#F0FDFA]"
        : result.status === "PARTIAL"
        ? "border-[#8A5A00]/30 bg-[#FFF1CC]"
        : "border-[#9F1D1D]/30 bg-[#FDE2E2]"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-semibold text-sm ${
          result.status === "APPLIED" ? "text-[#0F766E]"
          : result.status === "PARTIAL" ? "text-[#8A5A00]"
          : "text-[#9F1D1D]"
        }`}>{result.status}</span>
        {result.verified_opens_in_excel && (
          <span className="text-[12px] text-[#0F766E]">· Written by Excel and verified to open in Excel</span>
        )}
      </div>
      <p className="text-[13px] text-[#374151]">{result.message}</p>
      <div className="mt-3 flex gap-2">
        <a
          href={api.downloadUrl(sessionId, result.output_name)}
          className="px-3 py-1.5 bg-[#1F3A5F] text-white rounded-md text-[12px] font-medium"
        >
          Download {result.output_name}
        </a>
        <button
          onClick={onReanalyze}
          disabled={reanalyzing}
          className="px-3 py-1.5 border border-[#1F3A5F] text-[#1F3A5F] rounded-md text-[12px] font-medium disabled:opacity-50"
        >
          {reanalyzing ? "Re-analyzing…" : "Re-analyze prepared file"}
        </button>
      </div>
      {result.failed.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-1">FAILED OPERATIONS</div>
          <div className="flex flex-col gap-1">
            {result.failed.map((op, i) => (
              <div key={i} className="text-[12px] font-mono text-[#9F1D1D]">
                {op.sheet}{op.cell ? `!${op.cell}` : ""} — {op.error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The grids whose name would be meaningless ("Cashflows C4") and the
 * context-aware alternative the assistant proposes for each. Naming writes
 * nothing on its own -- accepted names change what the "grid titles" action
 * below proposes, and that is still reviewed and approved like any other change.
 */
function GridNamesPanel({ sessionId, onPlan }: { sessionId: string; onPlan: (plan: PrepAction[]) => void }) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<api.GridNamesResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const out = await api.suggestGridNames(sessionId, true);
      setRes(out);
      setOpen(true);
      if (out.plan) onPlan(out.plan);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const changed = (res?.names ?? []).filter((n) => n.suggested && n.suggested !== n.deterministic);
  return (
    <div className="border border-[#E5E7EB] rounded-xl bg-white mb-3">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] text-[#111827]">Name grids from their context</div>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            Some grids have no heading nearby, so the title action can only call them{" "}
            <span className="font-mono">&lt;Sheet&gt; &lt;Cell&gt;</span>. The assistant reads the cells
            around each one and proposes a real name. Nothing is written until you approve the
            grid-titles change below.
          </p>
          {res && !res.available && (
            <div className="text-[12px] text-[#8A5A00] bg-[#FFF1CC] border border-[#8A5A00]/20 rounded px-2 py-1 mt-2">
              Assistant unavailable — the deterministic names stand. {res.message}
            </div>
          )}
          {res?.available && (
            <div className="text-[12px] text-[#0F766E] mt-2">
              {changed.length} of {res.names.length} grid{res.names.length !== 1 ? "s" : ""} renamed
              {res.applied && " · folded into the plan below"}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {res && res.names.length > 0 && (
            <button onClick={() => setOpen(!open)} className="text-[12px] text-[#6B7280] hover:text-[#374151]">
              {open ? "Hide" : "Show"} names ↓
            </button>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="px-3 py-1.5 border border-[#1F3A5F] text-[#1F3A5F] rounded-md text-[12px] font-medium disabled:opacity-50"
          >
            {loading ? "Naming…" : res ? "Name again" : "Suggest names"}
          </button>
        </div>
      </div>
      {err && (
        <div className="px-4 pb-3 text-[12px] text-[#9F1D1D]" role="alert">{err}</div>
      )}
      {open && res?.names?.length ? (
        <div className="px-4 pb-4 border-t border-[#F3F4F6]">
          <div className="overflow-x-auto pt-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] text-[#9CA3AF] tracking-wider">
                  <th className="pb-2 pr-3 font-semibold">GRID</th>
                  <th className="pb-2 pr-3 font-semibold">FROM THE CELLS AROUND IT</th>
                  <th className="pb-2 font-semibold">ASSISTANT</th>
                </tr>
              </thead>
              <tbody>
                {res.names.map((n) => (
                  <tr key={n.grid} className="border-t border-[#F3F4F6] align-top">
                    <td className="py-1.5 pr-3 font-mono text-[#6B7280] whitespace-nowrap">
                      {n.grid} <span className="text-[#C4C8CE]">{n.size}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-[#9CA3AF]">
                      {n.deterministic || "—"}
                      <div className="text-[10px] text-[#C4C8CE]">{n.deterministic_source}</div>
                    </td>
                    <td className={`py-1.5 ${n.suggested && n.suggested !== n.deterministic ? "text-[#0F766E] font-medium" : "text-[#6B7280]"}`}>
                      {n.suggested || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PrepScreen() {
  const plan = useStore((s) => s.plan);
  const sessionId = useStore((s) => s.sessionId);
  const currentVersion = useStore((s) => s.currentVersion);
  const addVersion = useStore((s) => s.addVersion);
  const setReport = useStore((s) => s.setReport);
  const setSummary = useStore((s) => s.setSummary);
  const applyAnalysis = useStore((s) => s.applyAnalysis);
  const lastDelta = useStore((s) => s.lastDelta);

  const [selected, setSelected] = useState<Set<string>>(
    new Set(plan.filter((a) => a.default_on && a.count > 0).map((a) => a.id))
  );
  const [applying, setApplying] = useState(false);
  const [applyPhase, setApplyPhase] = useState("");
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new plan (after a re-analysis) resets the selection to its defaults.
  useEffect(() => {
    setSelected(new Set(plan.filter((a) => a.default_on && a.count > 0).map((a) => a.id)));
  }, [plan]);

  async function reanalyzePrepared() {
    if (!sessionId || !currentVersion) return;
    setReanalyzing(true);
    setError(null);
    try {
      const res = await api.reanalyze(sessionId, currentVersion.id);
      setSummary(res.summary);
      setReport(res.report, res.plan);
      applyAnalysis({ delta: res.delta, versions: res.versions });
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReanalyzing(false);
    }
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  const selectedActions = plan.filter((a) => selected.has(a.id));
  const totalOps = selectedActions.reduce((n, a) => n + a.operations.length, 0);
  const allOps = selectedActions.flatMap((a) => a.operations);

  async function applyChanges() {
    if (!sessionId || allOps.length === 0) return;
    setApplying(true);
    setResult(null);
    const phases = ["Copy", "Excel", "Verify", "Change log"];
    for (const p of phases) {
      setApplyPhase(p);
      await new Promise((r) => setTimeout(r, 600));
    }
    setError(null);
    try {
      // The prepared file becomes the current version and is re-analyzed straight away,
      // so Findings reflect the fix without a manual re-analysis.
      const out = await api.applyOperations(sessionId, allOps, { reanalyze: true });
      setResult(out.result);
      addVersion(out.version);
      applyAnalysis({ summary: out.summary, report: out.report, plan: out.plan, delta: out.delta });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
      setApplyPhase("");
    }
  }

  if (plan.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-64 text-[#9CA3AF] text-sm gap-2">
        <span className="text-2xl">✓</span>
        Nothing to prepare. Upload and analyze a workbook first.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] bg-white flex-shrink-0">
        <h1 className="text-lg font-semibold text-[#111827] mb-1">Prep</h1>
        <p className="text-[13px] text-[#6B7280]">
          Each change is planned from the findings and listed cell by cell. Select what you approve;
          Excel writes them to a fresh copy, the copy is verified to open, and a change log is written.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 pb-28">
        {error && (
          <div className="mb-4 text-[12px] text-[#9F1D1D] bg-[#FDE2E2] border border-[#9F1D1D]/20 rounded px-3 py-2" role="alert">
            {error}
          </div>
        )}
        {result && sessionId && (
          <div className="mb-5" aria-live="polite">
            <ResultCard result={result} sessionId={sessionId} onReanalyze={reanalyzePrepared} reanalyzing={reanalyzing} />
            {lastDelta && (
              <div className="mt-2 text-[12px] text-[#0F766E] bg-[#F0FDFA] border border-[#0F766E]/20 rounded-lg px-3 py-2">
                Findings re-analyzed: {lastDelta.fixed.length} fixed
                {lastDelta.fixed.length > 0 && <span className="font-mono"> ({lastDelta.fixed.map((d) => d.rule_id).join(", ")})</span>}
                {lastDelta.improved.length > 0 && <span> · {lastDelta.improved.length} improved</span>}
                {lastDelta.regressed.length > 0 && <span className="text-[#9F1D1D]"> · {lastDelta.regressed.length} regressed</span>}
                <span className="font-mono text-[#6B7280]"> · errors {lastDelta.previous_counts.ERROR ?? 0} → {lastDelta.counts.ERROR ?? 0}</span>
                <Link to="/findings" className="ml-2 underline underline-offset-2">View findings →</Link>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 max-w-3xl">
          {sessionId && <GridNamesPanel sessionId={sessionId} onPlan={(p) => applyAnalysis({ plan: p })} />}
          {plan.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              checked={selected.has(action.id)}
              onChange={toggle}
            />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-52 right-0 bg-white border-t border-[#E5E7EB] px-6 py-3 flex items-center gap-4 z-20">
        {applying ? (
          <div className="flex items-center gap-3 text-[13px] text-[#6B7280]" aria-live="assertive" aria-label="Applying changes">
            <div className="w-4 h-4 border-2 border-[#1F3A5F] border-t-transparent rounded-full animate-spin" />
            <span>Phase: <strong className="text-[#111827]">{applyPhase}</strong></span>
            <span>Copy · Excel · Verify · Change log</span>
          </div>
        ) : (
          <>
            <span className="text-[13px] text-[#6B7280]">
              {selected.size} action{selected.size !== 1 ? "s" : ""} selected · {totalOps} operation{totalOps !== 1 ? "s" : ""}
            </span>
            <button
              onClick={applyChanges}
              disabled={selected.size === 0}
              className="ml-auto px-5 py-2 bg-[#1F3A5F] text-white rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-40"
            >
              Apply {selected.size} selected change{selected.size !== 1 ? "s" : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
