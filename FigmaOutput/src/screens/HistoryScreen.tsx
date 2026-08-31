import { useState, useEffect } from "react";
import { useStore } from "../store";
import * as api from "../services/api";
import type { Version } from "../types";
import OperationsTable from "../components/OperationsTable";

function TimelineEntry({ version, index, total, sessionId }: { version: Version; index: number; total: number; sessionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLast = index === total - 1;
  const sourceColors: Record<string, string> = {
    upload: "bg-[#E9ECEF] text-[#4B5563]",
    prep: "bg-[#EEF2FF] text-[#3730A3]",
    assistant: "bg-[#F0FDFA] text-[#0F766E]",
    formula: "bg-[#FFF7ED] text-[#9A3412]",
    convert: "bg-[#F9FAFB] text-[#6B7280]",
    grid_namer: "bg-[#FDF4FF] text-[#86198F]",
  };
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-3 h-3 rounded-full border-2 border-[#1F3A5F] bg-white mt-1.5" />
        {!isLast && <div className="w-px flex-1 bg-[#E5E7EB] mt-1" style={{ minHeight: 40 }} />}
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-[13px] text-[#111827]">{version.label}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${sourceColors[version.source] ?? "bg-[#F3F4F6] text-[#6B7280]"}`}>
            {version.source}
          </span>
          {version.verified_opens_in_excel && (
            <span className="text-[11px] text-[#0F766E] font-mono">✓ verified</span>
          )}
        </div>
        <div className="text-[12px] text-[#9CA3AF] font-mono mt-0.5">
          {new Date(version.created_at).toLocaleString()} · sha256: {version.sha256}
        </div>
        <div className="flex gap-2 mt-2">
          <a
            href={api.downloadUrl(sessionId, version.file_name)}
            className="text-[12px] text-[#1F3A5F] underline underline-offset-2 font-medium"
          >
            Download
          </a>
          {version.change_log.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[12px] text-[#6B7280] underline underline-offset-2"
            >
              {expanded ? "Hide" : "Show"} {version.change_log.length} change{version.change_log.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
        {expanded && version.change_log.length > 0 && (
          <div className="mt-3">
            <OperationsTable operations={version.change_log} compact />
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryScreen() {
  const sessionId = useStore((s) => s.sessionId);
  const versions = useStore((s) => s.versions);
  const setVersions = useStore((s) => s.setVersions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      setLoading(versions.length === 0);
      api.listVersions(sessionId).then((v) => setVersions(v)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="p-8 text-[13px] text-[#9CA3AF]">No session active. Upload a workbook first.</div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-[#111827] mb-1">History</h1>
      <p className="text-[13px] text-[#6B7280] mb-6">
        Version lineage — every write is a new file, verified to open, with a full change log.
      </p>
      {loading ? (
        <div className="text-[13px] text-[#9CA3AF]">Loading…</div>
      ) : versions.length === 0 ? (
        <div className="text-[13px] text-[#9CA3AF]">No versions yet.</div>
      ) : (
        <div className="flex flex-col">
          {[...versions].reverse().map((v, i) => (
            <TimelineEntry key={v.id} version={v} index={i} total={versions.length} sessionId={sessionId} />
          ))}
        </div>
      )}
    </div>
  );
}
