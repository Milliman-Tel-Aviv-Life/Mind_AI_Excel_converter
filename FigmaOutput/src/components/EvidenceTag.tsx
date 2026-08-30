import type { Evidence } from "../types";

const configs: Record<Evidence, { label: string; className: string }> = {
  DETERMINISTIC_FINDING: { label: "DETERMINISTIC", className: "bg-[#EEF2FF] text-[#3730A3]" },
  INFERENCE: { label: "INFERENCE", className: "bg-[#F5F3FF] text-[#6D28D9]" },
  RECOMMENDATION: { label: "RECOMMENDATION", className: "bg-[#F0FDF4] text-[#166534]" },
  DOCUMENTED_RULE: { label: "DOCUMENTED RULE", className: "bg-[#F0F9FF] text-[#075985]" },
  USER_PROVIDED: { label: "USER PROVIDED", className: "bg-[#FFF7ED] text-[#9A3412]" },
};

export default function EvidenceTag({ evidence }: { evidence: Evidence }) {
  const { label, className } = configs[evidence];
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${className}`}>
      {label}
    </span>
  );
}
