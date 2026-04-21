import { Coins } from "lucide-react";

export default function TokenBalance({ tokens = 0, type = "standard" }) {
  const estimate = type === "url" ? Math.floor(tokens / 20) : Math.floor(tokens / 3);
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border-2 border-yellow-400 rounded-full">
      <Coins className="w-4 h-4 text-yellow-600" strokeWidth={2.5} />
      <span className="font-black text-sm text-yellow-800">{tokens}</span>
      <span className="text-xs font-bold text-yellow-600">credits</span>
      {estimate > 0 && (
        <span className="text-xs text-yellow-500">(~{estimate} posts)</span>
      )}
    </div>
  );
}