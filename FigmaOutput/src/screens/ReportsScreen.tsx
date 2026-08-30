import { useState } from "react";
import { useStore } from "../store";
import * as api from "../services/api";
import type { ReportBuild } from "../types";

export default function ReportsScreen() {
  const sessionId = useStore((s) => s.sessionId);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ReportBuild | null>(null);

  if (!sessionId) {
    return (
      <div className="p-8 text-[13px] text-[#9CA3AF]">Upload and analyze a workbook first.</div>
    );
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await api.generateReports(sessionId!);
      setResult(res);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-[#111827] mb-1">Reports</h1>
      <p className="text-[13px] text-[#6B7280] mb-6">
        Generate a standalone findings report (.xlsx) and a workbook copy with embedded report sheets.
      </p>

      {!result ? (
        <button
          onClick={generate}
          disabled={generating}
          className="px-6 py-3 bg-[#1F3A5F] text-white rounded-lg font-semibold text-sm hover:bg-[#162d4a] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {generating && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {generating ? "Generating…" : "Generate reports"}
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite">
          <div className="border border-[#E5E7EB] rounded-xl bg-white p-5 flex flex-col gap-3">
            <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider">STANDALONE REPORT</div>
            <div className="font-mono text-[13px] text-[#374151]">{result.standalone_name}</div>
            <div className="text-[12px] text-[#6B7280]">
              Summary + Findings sheets · always valid · generated with {result.method}
            </div>
            <a
              href={api.downloadUrl(sessionId, result.standalone_name)}
              className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F3A5F] text-white rounded-lg text-[13px] font-medium hover:bg-[#162d4a] transition-colors"
            >
              Download .xlsx
            </a>
          </div>

          <div className="border border-[#E5E7EB] rounded-xl bg-white p-5 flex flex-col gap-3">
            <div className="text-[11px] font-semibold text-[#9CA3AF] tracking-wider">WORKBOOK COPY + REPORT SHEETS</div>
            <div className="font-mono text-[13px] text-[#374151]">{result.workbook_name}</div>
            {result.verified_opens_in_excel && (
              <div className="text-[12px] text-[#0F766E] flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
                Verified to open in Excel
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="text-[12px] text-[#8A5A00] bg-[#FFF1CC] border border-[#8A5A00]/20 rounded px-2 py-1.5">
                {result.warnings[0]}
              </div>
            )}
            <a
              href={api.downloadUrl(sessionId, result.workbook_name)}
              className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F3A5F] text-white rounded-lg text-[13px] font-medium hover:bg-[#162d4a] transition-colors"
            >
              Download workbook
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
