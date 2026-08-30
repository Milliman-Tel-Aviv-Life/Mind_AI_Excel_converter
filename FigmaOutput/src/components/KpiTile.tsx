import type { Status } from "../types";

const configs: Record<Status, { label: string; bg: string; text: string; border: string }> = {
  ERROR: { label: "Error", bg: "bg-[#FDE2E2]", text: "text-[#9F1D1D]", border: "border-[#9F1D1D]/20" },
  REQUIRES_USER_INPUT: { label: "Needs input", bg: "bg-[#FFE4C7]", text: "text-[#7A3E00]", border: "border-[#7A3E00]/20" },
  NOT_SUPPORTED: { label: "Not supported", bg: "bg-[#E9ECEF]", text: "text-[#4B5563]", border: "border-[#4B5563]/20" },
  WARNING: { label: "Warning", bg: "bg-[#FFF1CC]", text: "text-[#8A5A00]", border: "border-[#8A5A00]/20" },
  PASS: { label: "Pass", bg: "bg-[#DFF5E6]", text: "text-[#0F6E3A]", border: "border-[#0F6E3A]/20" },
};

const order: Status[] = ["ERROR", "REQUIRES_USER_INPUT", "NOT_SUPPORTED", "WARNING", "PASS"];

interface Props {
  counts: Partial<Record<Status, number>>;
  onFilter?: (status: Status) => void;
  activeFilter?: Status | null;
}

export default function KpiTiles({ counts, onFilter, activeFilter }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      {order.map((status) => {
        const count = counts[status] ?? 0;
        const { label, bg, text, border } = configs[status];
        const isActive = activeFilter === status;
        return (
          <button
            key={status}
            onClick={() => onFilter?.(status)}
            className={`flex flex-col items-center px-5 py-3 rounded-lg border transition-all ${bg} ${text} ${border} ${
              isActive ? "ring-2 ring-offset-1 ring-current" : "hover:opacity-80"
            } ${count === 0 ? "opacity-40" : ""}`}
          >
            <span className="text-2xl font-bold font-mono leading-none">{count}</span>
            <span className="text-xs mt-1 font-medium whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
