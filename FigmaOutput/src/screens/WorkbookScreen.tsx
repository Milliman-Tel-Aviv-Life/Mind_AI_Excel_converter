import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import * as api from "../services/api";
import type { Mode } from "../types";
import VersionChip from "../components/VersionChip";

const modes: { value: Mode; label: string; desc: string }[] = [
  { value: "plan", label: "Plan", desc: "Analyze everything — full 94-rule scan" },
  { value: "prep_loops", label: "Prep Mind Loops", desc: "Focus on MM_LOOP and dimension rules" },
  { value: "fix_formulas", label: "Fix Incompatible Formulas", desc: "Target FRM-* rules only" },
  { value: "structure_fix", label: "Structure Fix", desc: "STR-* and FMT-* rules only" },
];

const trustStatements = [
  "Original never modified",
  "Outputs written by Excel and verified",
  "93 rules from the Mind knowledge base",
];

export default function WorkbookScreen() {
  const navigate = useNavigate();
  const summary = useStore((s) => s.summary);
  const mode = useStore((s) => s.mode);
  const currentVersion = useStore((s) => s.currentVersion);
  const versions = useStore((s) => s.versions);
  const setMode = useStore((s) => s.setMode);
  const setSession = useStore((s) => s.setSession);
  const setChatHistory = useStore((s) => s.setChatHistory);
  const resetSession = useStore((s) => s.resetSession);
  const setIsUploading = useStore((s) => s.setIsUploading);
  const isUploading = useStore((s) => s.isUploading);

  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<"idle" | "analyzing">("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseFile(file: File) {
    if (!file.name.match(/\.(xlsx|xlsm|xlsb)$/i)) {
      setError("Please choose an .xlsx, .xlsm or .xlsb file.");
      return;
    }
    setError(null);
    setPendingFile(file);
  }

  async function runAnalysis() {
    if (!pendingFile) {
      fileRef.current?.click();
      return;
    }
    setIsUploading(true);
    setPhase("analyzing");
    setError(null);
    try {
      const res = await api.uploadWorkbook(pendingFile, mode);
      setSession(res.sessionId, res.summary, res.report, res.plan, res.version);
      setChatHistory([]);
      navigate("/findings");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsUploading(false);
      setPhase("idle");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) chooseFile(file);
  }

  if (summary) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-lg font-semibold text-[#111827] mb-1">Workbook</h1>
        <p className="text-sm text-[#6B7280] mb-6">Current file and version lineage.</p>

        <div className="border border-[#E5E7EB] rounded-xl bg-white p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono font-semibold text-[#111827] text-base">{summary.file_name}</div>
              <div className="text-sm text-[#6B7280] mt-0.5 font-mono">{summary.sha256} · {summary.file_type.toUpperCase()}</div>
            </div>
            {currentVersion && <VersionChip version={currentVersion} />}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            {[
              ["Application", summary.application ?? "—"],
              ["Has VBA", summary.has_vba ? "Yes" : "No"],
              ["Sheets", `${summary.sheet_count} (${summary.hidden_sheet_count} hidden)`],
              ["Grids", `${summary.grid_count} (${summary.flagged_grid_count} flagged)`],
              ["Formulas", `${summary.formula_count.toLocaleString()} (${summary.array_formula_count} array)`],
              ["External links", String(summary.external_link_part_count)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280]">{k}</span>
                <span className="font-mono text-[#111827]">{v}</span>
              </div>
            ))}
          </div>
          {Object.keys(summary.mm_functions_used).length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-2">MM_ FUNCTIONS</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.mm_functions_used).map(([fn, count]) => (
                  <span key={fn} className="font-mono text-[12px] px-2 py-1 rounded-md bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]">
                    {fn} ×{count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border border-[#E5E7EB] rounded-xl bg-white p-6 mb-6">
          <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-3">VERSION LINEAGE</div>
          <div className="flex flex-col gap-0">
            {versions.map((v, i) => (
              <div key={v.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-[#1F3A5F] mt-1.5 flex-shrink-0" />
                  {i < versions.length - 1 && <div className="w-px flex-1 bg-[#E5E7EB] my-1" style={{ minHeight: 20 }} />}
                </div>
                <div className="pb-4">
                  <VersionChip version={v} />
                  <div className="text-[11px] text-[#9CA3AF] mt-1 font-mono">
                    {new Date(v.created_at).toLocaleString()} · {v.sha256}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (window.confirm("Start over with another workbook? This session's versions stay downloadable until the server restarts.")) resetSession(); }}
          className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] text-[#374151] hover:border-[#1F3A5F] transition-colors"
        >
          Load another workbook
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-[#111827] mb-1">Upload workbook</h1>
      <p className="text-sm text-[#6B7280] mb-6">
        Drop an Excel file to analyze it against 94 Mind readiness rules.
      </p>

      {phase === "analyzing" ? (
        <div className="border border-[#E5E7EB] rounded-xl bg-white p-10 flex flex-col items-center gap-5">
          <div className="w-10 h-10 border-2 border-[#1F3A5F] border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-medium text-[#374151]">Analyzing {pendingFile?.name}…</div>
          <div className="flex gap-6 text-[12px] text-[#9CA3AF]">
            {["Inventory", "Rules", "Plan"].map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1F3A5F] animate-pulse" />
                {p}
              </div>
            ))}
          </div>
          <div className="text-[12px] text-[#9CA3AF]">Typical run: 4–25 s (an .xlsb is first converted through Excel)</div>
        </div>
      ) : (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
              dragOver
                ? "border-[#1F3A5F] bg-[#EEF2FF]"
                : pendingFile
                ? "border-[#1F3A5F] bg-white"
                : "border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#1F3A5F] hover:bg-white"
            }`}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-[#9CA3AF]">
              <rect x="4" y="4" width="20" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M12 4v8h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M25 21v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {pendingFile ? (
              <>
                <div className="text-sm font-medium text-[#111827] font-mono">{pendingFile.name}</div>
                <div className="text-[12px] text-[#9CA3AF]">{(pendingFile.size / 1024 / 1024).toFixed(1)} MB · click to choose another file</div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-[#374151]">Drop .xlsx / .xlsm / .xlsb here</div>
                <div className="text-[12px] text-[#9CA3AF]">or click to browse</div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm,.xlsb"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) chooseFile(f); e.target.value = ""; }}
            />
          </div>

          <div className="mt-5">
            <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider mb-3">ANALYSIS MODE</div>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`text-left px-4 py-3 rounded-lg border text-[13px] transition-colors ${
                    mode === m.value
                      ? "border-[#1F3A5F] bg-[#EEF2FF] text-[#1F3A5F]"
                      : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#1F3A5F]"
                  }`}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-[11px] mt-0.5 text-[#6B7280]">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 text-[12px] text-[#9F1D1D] bg-[#FDE2E2] border border-[#9F1D1D]/20 rounded px-3 py-2" role="alert">
              {error}
            </div>
          )}

          <button
            onClick={runAnalysis}
            disabled={isUploading}
            className="mt-5 w-full px-5 py-3 bg-[#1F3A5F] text-white rounded-lg font-semibold text-sm hover:bg-[#162d4a] transition-colors disabled:opacity-50"
          >
            {pendingFile ? "Run analysis" : "Choose a workbook"}
          </button>

          <div className="mt-5 flex flex-col gap-1.5">
            {trustStatements.map((s) => (
              <div key={s} className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#0F766E" strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3-3" stroke="#0F766E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {s}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
