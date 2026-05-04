import SchedoraCoin from "@/components/SchedoraCoin";

export default function TokenBalance({ tokens = 0, type = "standard" }) {
  const estimate = type === "url" ? Math.floor(tokens / 20) : Math.floor(tokens / 3);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-brutal">
      <SchedoraCoin size={18} animated whiteBg />
      <span className="font-semibold text-sm text-text-primary">{tokens}</span>
      <span className="text-xs font-medium text-text-muted">credits</span>
      {estimate > 0 && (
        <span className="text-xs text-text-muted">(~{estimate} posts)</span>
      )}
    </div>
  );
}
