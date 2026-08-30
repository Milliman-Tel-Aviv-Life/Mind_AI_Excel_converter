export default function FlagChip({ flag }: { flag: string }) {
  return (
    <code className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[11px] text-[#374151]">
      {flag}
    </code>
  );
}
