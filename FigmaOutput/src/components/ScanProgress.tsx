import { useEffect, useState } from "react";
import * as api from "../services/api";
import type { ScanStatus } from "../types";

/**
 * Polls the backend's scan status (GET /api/sessions/{id}/status) every
 * `intervalMs` while `active`. Null before the first answer and on backends
 * without the endpoint (older than 1.6.6) -- callers fall back to a plain spinner.
 */
export function useScanStatus(sessionId: string | null, active: boolean, intervalMs = 600): ScanStatus | null {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  useEffect(() => {
    if (!active || !sessionId) {
      setStatus(null);
      return;
    }
    let stopped = false;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const s = await api.scanStatus(sessionId);
        if (!stopped) setStatus(s);
      } catch {
        /* no status endpoint on this backend, or a transient error: keep the last value */
      }
      if (!stopped) timer = window.setTimeout(tick, intervalMs);
    };
    tick();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sessionId, active, intervalMs]);
  return status;
}

const STAGES: { id: string; label: string }[] = [
  { id: "convert", label: "Convert" },
  { id: "copy", label: "Copy" },
  { id: "load", label: "Read" },
  { id: "inventory", label: "Scan" },
  { id: "names", label: "Names" },
  { id: "rules", label: "Rules" },
  { id: "report", label: "Report" },
  { id: "plan", label: "Plan" },
];

/** Seconds since `since`, ticking every second so the indicator moves between polls. */
function useElapsed(since: number | null): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (since === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.round((now - since) / 1000));
}

interface Props {
  status: ScanStatus | null;
  fileName?: string;
  /** Sheets this scan skips (shown so the user remembers the choice). */
  ignored?: string[];
  /** When the scan started on the client (for the elapsed counter before the first status arrives). */
  startedAt?: number | null;
  compact?: boolean;
}

/** The status indicator of a running scan: stage, what is being worked on, overall progress, elapsed time. */
export default function ScanProgress({ status, fileName, ignored = [], startedAt = null, compact = false }: Props) {
  const elapsedLocal = useElapsed(startedAt);
  const elapsed = status?.elapsed_s != null && status.elapsed_s > 0 ? Math.round(status.elapsed_s) : elapsedLocal;
  const overall = Math.max(0, Math.min(1, status?.overall ?? 0));
  const done = new Set((status?.stages ?? []).map((s) => s.stage));
  const current = status?.stage ?? null;
  const stages = STAGES.filter((s) => s.id !== "convert" || status?.needs_convert);
  const title = status?.title ?? "Analyzing";
  const message = status?.message ?? "Uploading and opening the workbook…";

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] text-[#374151]" title={message}>
        <span className="w-3 h-3 border-2 border-[#1F3A5F] border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">{title}</span>
        <span className="font-mono text-[#6B7280]">{Math.round(overall * 100)}%</span>
        <span className="text-[#9CA3AF]">{elapsed}s</span>
      </span>
    );
  }

  return (
    <div className="border border-[#E5E7EB] rounded-xl bg-white p-8 flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="w-10 h-10 border-2 border-[#1F3A5F] border-t-transparent rounded-full animate-spin" />
      <div className="text-sm font-medium text-[#111827]">
        {title}
        {fileName ? <span className="text-[#6B7280] font-normal"> · {fileName}</span> : null}
      </div>
      <div className="w-full max-w-md">
        <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
          <div className="h-full bg-[#1F3A5F] rounded-full transition-all duration-500" style={{ width: `${Math.round(overall * 100)}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-[#9CA3AF] font-mono">
          <span>{Math.round(overall * 100)}%</span>
          <span>{elapsed}s</span>
        </div>
      </div>
      <div className="text-[12px] text-[#374151] text-center max-w-md truncate w-full" title={message}>
        {message}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px]">
        {stages.map((s) => {
          const isDone = done.has(s.id) || status?.state === "ready";
          const isCurrent = current === s.id && status?.state === "running";
          return (
            <div key={s.id} className={`flex items-center gap-1.5 ${isDone ? "text-[#0F6E3A]" : isCurrent ? "text-[#1F3A5F] font-medium" : "text-[#9CA3AF]"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-[#0F6E3A]" : isCurrent ? "bg-[#1F3A5F] animate-pulse" : "bg-[#D1D5DB]"}`} />
              {s.label}
            </div>
          );
        })}
      </div>
      {ignored.length > 0 && (
        <div className="text-[11px] text-[#6B7280]">
          Skipping {ignored.length} sheet{ignored.length === 1 ? "" : "s"}: <span className="font-mono">{ignored.join(", ")}</span>
        </div>
      )}
      {!status && <div className="text-[11px] text-[#9CA3AF]">Live progress appears once the backend reports its first stage.</div>}
    </div>
  );
}
