import type { Grid, Finding, Status } from "../types";
import FlagChip from "./FlagChip";
import StatusPill from "./StatusPill";

interface Props {
  grid: Grid;
  findings?: Finding[];
  onClick?: () => void;
}

const rank: Record<Status, number> = { ERROR: 4, NOT_SUPPORTED: 3, REQUIRES_USER_INPUT: 2, WARNING: 1, PASS: 0 };

export function worstStatus(findings: Finding[]): Status | null {
  if (findings.length === 0) return null;
  return findings.reduce<Status>((w, f) => (rank[f.status] > rank[w] ? f.status : w), "PASS");
}

export default function GridCard({ grid, findings = [], onClick }: Props) {
  const isUntitled = !grid.title;
  const worst = worstStatus(findings);
  const actionable = findings.some((f) => f.status !== "PASS");
  const clickable = Boolean(onClick) && actionable;

  return (
    <div
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? `${findings.filter((f) => f.status !== "PASS").length} finding(s) — click to fix` : undefined}
      className={`rounded-lg border p-3 flex flex-col gap-2 text-[13px] transition-colors ${
        isUntitled ? "border-dashed border-[#D1D5DB] bg-[#FAFAFA]" : "border-[#E5E7EB] bg-white"
      } ${clickable ? "cursor-pointer hover:border-[#1F3A5F] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isUntitled ? (
            <span className="font-mono text-[#9CA3AF] text-[12px]">untitled {grid.anchor}</span>
          ) : (
            <span className="font-mono font-semibold text-[#1F3A5F] text-[12px] truncate block">
              #{grid.name}
            </span>
          )}
          <span className="font-mono text-[#9CA3AF] text-[11px]">
            {grid.sheet}!{grid.ref}
          </span>
        </div>
        {worst && <StatusPill status={worst} size="sm" />}
      </div>
      {grid.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {grid.flags.map((f) => <FlagChip key={f.raw} flag={f.raw} />)}
        </div>
      )}
      {grid.header_values.filter(Boolean).length > 0 && (
        <div className="text-[11px] text-[#6B7280] font-mono truncate">
          {grid.header_values.filter(Boolean).slice(0, 4).join(" · ")}
          {grid.header_values.filter(Boolean).length > 4 && " …"}
        </div>
      )}
      {actionable && (
        <div className="flex flex-wrap gap-1">
          {findings.filter((f) => f.status !== "PASS").slice(0, 4).map((f) => (
            <span key={f.rule_id} className="font-mono text-[10px] text-[#1F3A5F] bg-[#EEF2FF] px-1 py-0.5 rounded">{f.rule_id}</span>
          ))}
          {findings.filter((f) => f.status !== "PASS").length > 4 && <span className="text-[10px] text-[#9CA3AF]">…</span>}
        </div>
      )}
      <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] font-mono mt-auto pt-1 border-t border-[#F3F4F6]">
        <span>{grid.n_rows}r × {grid.n_cols}c</span>
        {grid.formula_count > 0 && <span>{grid.formula_count} fml</span>}
        {clickable && <span className="ml-auto text-[#1F3A5F]">fix →</span>}
      </div>
    </div>
  );
}
