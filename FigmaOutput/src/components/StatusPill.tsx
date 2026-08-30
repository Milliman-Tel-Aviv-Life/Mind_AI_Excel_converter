import type { Status } from "../types";

const configs: Record<Status, { label: string; className: string }> = {
  PASS: { label: "PASS", className: "bg-[#DFF5E6] text-[#0F6E3A] border-[#0F6E3A]/20" },
  WARNING: { label: "WARNING", className: "bg-[#FFF1CC] text-[#8A5A00] border-[#8A5A00]/20" },
  ERROR: { label: "ERROR", className: "bg-[#FDE2E2] text-[#9F1D1D] border-[#9F1D1D]/20" },
  REQUIRES_USER_INPUT: { label: "NEEDS INPUT", className: "bg-[#FFE4C7] text-[#7A3E00] border-[#7A3E00]/20" },
  NOT_SUPPORTED: { label: "NOT SUPPORTED", className: "bg-[#E9ECEF] text-[#4B5563] border-[#4B5563]/20" },
};

interface Props {
  status: Status;
  size?: "sm" | "md";
}

export default function StatusPill({ status, size = "md" }: Props) {
  const { label, className } = configs[status];
  return (
    <span
      className={`inline-flex items-center border font-mono font-semibold tracking-wide rounded ${className} ${
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      {label}
    </span>
  );
}
