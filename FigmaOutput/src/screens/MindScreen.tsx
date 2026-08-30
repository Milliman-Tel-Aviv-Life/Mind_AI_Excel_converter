import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import * as api from "../services/api";
import type { MindLoopIteration, MindLoopStatus } from "../services/api";

/**
 * The app runs itself against real Milliman Mind: prepare a fresh copy, check
 * the numbers, upload, convert, run, read what Mind shows, decide, repeat --
 * with nobody in the loop. This screen only starts it and watches.
 */

type Gate = { label: string; state: "ok" | "fail" | "skip" | "wait"; detail?: string };

function gates(it: MindLoopIteration): Gate[] {
  const nm = it.names, nums = it.numbers, mind = it.mind;
  const conv = mind?.convert, run = mind?.run, counts = mind?.counts;
  return [
    { label: "Prepared", state: it.apply ? (it.apply.status === "APPLIED" || it.apply.status === "NOT_APPLICABLE" ? "ok" : "fail") : "wait", detail: it.apply ? `${it.apply.applied} applied` : undefined },
    { label: "Numbers", state: !nums ? "wait" : !nums.ran ? "skip" : nums.match ? "ok" : "fail", detail: nums?.ran ? `${nums.compared} cells, ${nums.differences} differ` : nums?.message },
    { label: "Structure", state: !nm ? "wait" : nm.fragmented ? "fail" : "ok", detail: nm ? `${nm.baseline_grids} → ${nm.grids} grids` : undefined },
    { label: "Names", state: !nm ? "wait" : nm.still_titleable === 0 ? "ok" : "fail", detail: nm ? `${nm.unnamed} untitled, ${nm.blocked.length} blocked` : undefined },
    { label: "Convert", state: !mind ? "wait" : mind.skipped ? "skip" : conv?.success ? "ok" : "fail", detail: conv ? Object.entries(conv.steps).map(([k, v]) => `${k} ${v}`).join(" · ") : mind?.reason ?? mind?.error },
    { label: "Run", state: !mind || mind.skipped ? "skip" : !run ? (conv?.success ? "skip" : "wait") : run.completed && run.audit_consistent ? "ok" : "fail", detail: run ? (run.audit_consistent ? "consistent with the audit trail" : run.completed ? "completed, audit not confirmed" : "did not complete") : undefined },
    { label: "Counts", state: !counts || counts.mind_untitled === null ? "skip" : counts.mind_untitled === counts.app_untitled ? "ok" : "fail", detail: counts ? `Mind ${counts.mind_untitled ?? "?"} · app ${counts.app_untitled}` : undefined },
  ];
}

const GATE_STYLE: Record<Gate["state"], string> = {
  ok: "bg-[#DFF5E6] text-[#0F6E3A] border-[#0F6E3A]/20",
  fail: "bg-[#FDE2E2] text-[#9F1D1D] border-[#9F1D1D]/20",
  skip: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
  wait: "bg-white text-[#9CA3AF] border-[#E5E7EB] border-dashed",
};

function IterationCard({ it }: { it: MindLoopIteration }) {
  const [open, setOpen] = useState(false);
  const d = it.decision;
  return (
    <div className="border border-[#E5E7EB] rounded-xl bg-white">
      <div className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-[13px] text-[#111827]">Iteration {it.n}</span>
          <span className="text-[11px] font-mono text-[#6B7280]">{it.actions.map((a) => `${a.id}(${a.count})`).join(" ")}</span>
          {d && (
            <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded ${d.verdict === "converged" ? "bg-[#DFF5E6] text-[#0F6E3A]" : d.verdict === "retry" ? "bg-[#FFF1CC] text-[#8A5A00]" : "bg-[#FDE2E2] text-[#9F1D1D]"}`}>
              {d.verdict}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {gates(it).map((g) => (
            <span key={g.label} title={g.detail} className={`text-[11px] font-medium px-2 py-1 rounded-md border ${GATE_STYLE[g.state]}`}>
              {g.state === "ok" ? "✓" : g.state === "fail" ? "✕" : g.state === "skip" ? "–" : "…"} {g.label}
              {g.detail && <span className="font-normal opacity-80"> · {g.detail}</span>}
            </span>
          ))}
        </div>
        {d && <p className="text-[12px] text-[#374151] mt-3">{d.reason}</p>}
        <button onClick={() => setOpen(!open)} className="text-[12px] text-[#6B7280] hover:text-[#374151] mt-2">
          {open ? "Hide" : "Show"} details ↓
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-[#F3F4F6] flex flex-col gap-3 pt-3 text-[12px]">
          {it.mind?.convert?.errors?.length ? (
            <div>
              <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-1">MIND ERROR LOG</div>
              {it.mind.convert.errors.map((e, i) => <div key={i} className="font-mono text-[#9F1D1D]">{e}</div>)}
            </div>
          ) : null}
          {it.numbers?.listed?.length ? (
            <div>
              <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-1">CELLS THAT DIFFER</div>
              {it.numbers.listed.slice(0, 20).map((c, i) => (
                <div key={i} className="font-mono text-[#374151]">{c.sheet}!{c.cell ?? c.prepared_cell}: {String(c.source)} → {String(c.prepared)}</div>
              ))}
            </div>
          ) : null}
          {it.names?.blocked?.length ? (
            <div>
              <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-1">GRIDS THE APP CANNOT TITLE</div>
              {it.names.blocked.map((b, i) => <div key={i} className="text-[#6B7280]">{b}</div>)}
            </div>
          ) : null}
          {it.mind?.templates?.untitled?.length ? (
            <div>
              <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-1">UNTITLED IN MIND</div>
              <div className="font-mono text-[#6B7280]">{it.mind.templates.untitled.map((u) => `${u.label} = ${u.cell}`).join(" · ")}</div>
            </div>
          ) : null}
          {it.apply?.output && <div className="text-[#6B7280]">Prepared file: <span className="font-mono">{it.apply.output}</span></div>}
        </div>
      )}
    </div>
  );
}

export default function MindScreen() {
  const sessionId = useStore((s) => s.sessionId);
  const currentVersion = useStore((s) => s.currentVersion);
  const [status, setStatus] = useState<MindLoopStatus | null>(null);
  const [events, setEvents] = useState<api.MindLoopEvent[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxIterations, setMaxIterations] = useState(4);
  const [runModel, setRunModel] = useState(true);
  const nextRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    async function tick() {
      try {
        const st = await api.mindLoopStatus(sessionId!, nextRef.current);
        if (stop) return;
        if (st.events.length) {
          setEvents((prev) => [...prev, ...st.events]);
          nextRef.current = st.next;
        }
        setStatus(st);
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : String(e));
      }
    }
    tick();
    const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [sessionId]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [events.length]);

  async function start() {
    if (!sessionId) return;
    setStarting(true);
    setError(null);
    setEvents([]);
    nextRef.current = 0;
    try {
      await api.startMindLoop(sessionId, { maxIterations, runModel });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  if (!sessionId) {
    return <div className="p-8 text-[13px] text-[#9CA3AF]">Upload and analyze a workbook first.</div>;
  }
  const running = status?.state === "running";
  const report = status?.report ?? null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] bg-white flex-shrink-0">
        <h1 className="text-lg font-semibold text-[#111827] mb-1">Mind</h1>
        <p className="text-[13px] text-[#6B7280] max-w-2xl">
          The app runs itself: it prepares a fresh copy of <span className="font-mono">{currentVersion?.file_name}</span>,
          checks that every number still matches, uploads it to Milliman Mind, converts and runs it, reads what Mind
          shows, and repeats with one change at a time until everything looks good — or says exactly why it can't.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && <div className="mb-4 text-[12px] text-[#9F1D1D] bg-[#FDE2E2] border border-[#9F1D1D]/20 rounded px-3 py-2" role="alert">{error}</div>}

        <div className="border border-[#E5E7EB] rounded-xl bg-white p-4 mb-4 max-w-3xl flex flex-wrap items-center gap-4">
          <label className="text-[12px] text-[#374151] flex items-center gap-2">
            Max iterations
            <input type="number" min={1} max={8} value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} disabled={running}
              className="w-14 border border-[#E5E7EB] rounded px-2 py-1 text-[12px]" />
          </label>
          <label className="text-[12px] text-[#374151] flex items-center gap-2">
            <input type="checkbox" checked={runModel} onChange={(e) => setRunModel(e.target.checked)} disabled={running} className="accent-[#1F3A5F]" />
            Run the model after converting
          </label>
          <button onClick={start} disabled={running || starting}
            className="ml-auto px-4 py-2 bg-[#1F3A5F] text-white rounded-md text-[13px] font-medium disabled:opacity-50">
            {running ? "Running…" : starting ? "Starting…" : report ? "Run again" : "Run in Mind"}
          </button>
        </div>

        {report && (
          <div className={`rounded-xl border p-4 mb-4 max-w-3xl ${report.verdict === "converged" ? "border-[#0F766E]/30 bg-[#F0FDFA]" : report.verdict ? "border-[#9F1D1D]/30 bg-[#FDE2E2]" : "border-[#E5E7EB] bg-white"}`} aria-live="polite">
            <div className="font-semibold text-[13px] text-[#111827]">
              {report.verdict ? report.verdict.toUpperCase() : running ? "In progress" : "—"}
              {report.reason && <span className="font-normal text-[#374151]"> · {report.reason}</span>}
            </div>
            {report.final_workbook && <div className="text-[12px] text-[#0F766E] mt-1 font-mono">{report.final_workbook}</div>}
            {report.leftover_projects?.length ? (
              <div className="text-[12px] text-[#8A5A00] mt-1">Delete by hand in Mind: <span className="font-mono">{report.leftover_projects.join(", ")}</span> (projects that have been run cannot be deleted automatically)</div>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-3 max-w-3xl">
          {report?.iterations.map((it) => <IterationCard key={it.n} it={it} />)}
        </div>

        {(events.length > 0 || running) && (
          <div className="mt-4 max-w-3xl">
            <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-1">LIVE LOG</div>
            <div ref={logRef} className="bg-[#111827] text-[#E5E7EB] rounded-lg p-3 text-[11px] font-mono h-56 overflow-auto" aria-live="polite">
              {events.map((e, i) => (
                <div key={i} className={e.event === "decision" ? "text-[#FDE68A]" : e.event === "done" ? "text-[#9BE7B8]" : ""}>
                  {new Date(e.t * 1000).toLocaleTimeString()} {e.message}
                </div>
              ))}
              {running && <div className="text-[#9CA3AF]">…</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
