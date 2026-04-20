export default function SchedoraLogo({ size = "md", showWordmark = true, className = "" }) {
  const iconSizes = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
  };

  const wordmarkSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`relative shrink-0 ${iconSizes[size] || iconSizes.md}`}>
        <div className="absolute inset-0 rounded-[1.1rem] bg-white shadow-brutal-lg border-2 border-black" />
        <svg viewBox="0 0 120 120" className="relative h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="schedora-bubble" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4fd8" />
              <stop offset="55%" stopColor="#ff8a3d" />
              <stop offset="100%" stopColor="#ffd84d" />
            </linearGradient>
            <linearGradient id="schedora-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7d63ff" />
              <stop offset="55%" stopColor="#4f8df7" />
              <stop offset="100%" stopColor="#2ee6b7" />
            </linearGradient>
            <linearGradient id="schedora-screen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          <ellipse cx="60" cy="106" rx="34" ry="4" fill="rgba(0,0,0,0.08)" />

          <rect x="18" y="30" width="66" height="54" rx="22" fill="#ffffff" stroke="#2e2f55" strokeWidth="2.5" />
          <rect x="26" y="40" width="50" height="32" rx="13" fill="url(#schedora-screen)" />
          <circle cx="39" cy="56" r="6" fill="#72f5ff" />
          <circle cx="63" cy="56" r="6" fill="#72f5ff" />
          <path d="M46 62 C50 68, 58 68, 62 62" stroke="#72f5ff" strokeWidth="4" strokeLinecap="round" fill="none" />

          <rect x="22" y="84" width="56" height="34" rx="11" fill="#ffffff" stroke="url(#schedora-body)" strokeWidth="4" />
          <path d="M40 99 L49 108 L67 90" stroke="#35d6c7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          <path d="M16 56 C10 57, 8 72, 14 77 C17 80, 20 80, 22 77 L22 56 Z" fill="url(#schedora-body)" />
          <path d="M84 56 C90 57, 92 72, 86 77 C83 80, 80 80, 78 77 L78 56 Z" fill="url(#schedora-body)" />
          <path d="M60 26 C68 18, 74 13, 82 8" stroke="url(#schedora-body)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="86" cy="10" r="5" fill="url(#schedora-bubble)" />

          <path d="M79 8 C82 8, 86 12, 86 17 C86 28, 99 32, 104 31 C98 37, 89 38, 82 34 C76 30, 73 24, 73 18 C73 13, 75 8, 79 8 Z" fill="url(#schedora-bubble)" />
          <circle cx="84" cy="18" r="2.8" fill="#ffffff" />
          <circle cx="92" cy="20" r="2.8" fill="#ffffff" />
          <circle cx="100" cy="22" r="2.8" fill="#ffffff" />
        </svg>
      </div>

      {showWordmark && (
        <div className="leading-none">
          <div className={`font-black font-heading tracking-tighter text-text-primary ${wordmarkSizes[size] || wordmarkSizes.md}`}>
            Schedora
          </div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-text-muted">
            AI scheduling platform
          </div>
        </div>
      )}
    </div>
  );
}
