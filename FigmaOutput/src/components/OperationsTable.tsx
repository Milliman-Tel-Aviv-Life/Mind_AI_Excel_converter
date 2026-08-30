import type { Operation } from "../types";

interface Props {
  operations: Operation[];
  compact?: boolean;
}

export default function OperationsTable({ operations, compact = false }: Props) {
  const textSize = compact ? "text-[11px]" : "text-[13px]";
  return (
    <div className="overflow-x-auto rounded-md border border-[#E5E7EB]">
      <table className={`w-full border-collapse ${textSize}`}>
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <th className="px-3 py-2 text-left font-semibold text-[#6B7280] font-mono text-[11px] tracking-wide">SHEET</th>
            <th className="px-3 py-2 text-left font-semibold text-[#6B7280] font-mono text-[11px] tracking-wide">TARGET</th>
            <th className="px-3 py-2 text-left font-semibold text-[#6B7280] font-mono text-[11px] tracking-wide">BEFORE</th>
            <th className="px-3 py-2 text-left font-semibold text-[#6B7280] font-mono text-[11px] tracking-wide">AFTER</th>
            <th className="px-3 py-2 text-left font-semibold text-[#6B7280] font-mono text-[11px] tracking-wide">NOTE</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((op, i) => (
            <tr key={i} className={`border-b border-[#E5E7EB] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
              <td className="px-3 py-2 font-mono text-[#374151] whitespace-nowrap">{op.sheet}</td>
              <td className="px-3 py-2 font-mono text-[#374151] whitespace-nowrap">
                {op.cell ?? op.row != null ? `Row ${op.row}` : op.cells ? `${op.cells.length} cells` : op.op}
              </td>
              <td className="px-3 py-2 max-w-[200px] truncate" title={String(op.before ?? "")}>
                <span className="font-mono text-[#9F1D1D] bg-[#FDE2E2] px-1 py-0.5 rounded text-[10px]">
                  {op.before == null ? "—" : String(op.before)}
                </span>
              </td>
              <td className="px-3 py-2 max-w-[200px] truncate" title={String(op.after ?? "")}>
                <span className="font-mono text-[#0F6E3A] bg-[#DFF5E6] px-1 py-0.5 rounded text-[10px]">
                  {op.after == null ? "—" : String(op.after)}
                </span>
              </td>
              <td className="px-3 py-2 text-[#6B7280] max-w-[180px] truncate" title={op.note}>
                {op.note ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
