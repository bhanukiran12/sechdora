import SchedoraCoin from "@/components/SchedoraCoin";

export default function TokenBalance({ tokens = 0, type = "standard" }) {
  const estimate = type === "url" ? Math.floor(tokens / 20) : Math.floor(tokens / 3);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-fuchsia-50 via-orange-50 to-yellow-50 border-2 border-black rounded-full">
      <SchedoraCoin size={18} animated whiteBg />
      <span className="font-black text-sm text-text-primary">{tokens}</span>
      <span className="text-xs font-bold text-text-muted">Schedora coins</span>
      {estimate > 0 && (
        <span className="text-xs text-text-muted">(~{estimate} posts)</span>
      )}
    </div>
  );
}
