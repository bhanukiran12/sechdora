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
        <div className="absolute inset-0 rounded-[1.1rem] bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50 shadow-brutal-lg border border-border" />
        <svg viewBox="0 0 64 64" className="relative h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="schedora-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="55%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="schedora-accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>

          {/* Antenna */}
          <path d="M32 12 L48 6" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="49" cy="6" r="3.5" fill="#C7D2FE" stroke="#111111" strokeWidth="1.5" />

          {/* Robot head */}
          <rect x="10" y="13" width="44" height="30" rx="11" fill="url(#schedora-body-grad)" stroke="#111111" strokeWidth="2.5" />

          {/* Screen */}
          <rect x="16" y="19" width="32" height="18" rx="7" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />

          {/* Eyes */}
          <circle cx="25" cy="28" r="3" fill="#111111" />
          <circle cx="39" cy="28" r="3" fill="#111111" />
          <circle cx="26" cy="27" r="1" fill="#FFFFFF" />
          <circle cx="40" cy="27" r="1" fill="#FFFFFF" />

          {/* Side ears */}
          <rect x="6" y="22" width="4" height="12" rx="2" fill="url(#schedora-body-grad)" stroke="#111111" strokeWidth="1.5" />
          <rect x="54" y="22" width="4" height="12" rx="2" fill="url(#schedora-body-grad)" stroke="#111111" strokeWidth="1.5" />

          {/* Checkmark badge below (the "schedule done" mark) */}
          <rect x="14" y="44" width="36" height="14" rx="6" fill="#FFFFFF" stroke="#111111" strokeWidth="2" />
          <path d="M21 51 L26 56 L36 46" stroke="url(#schedora-accent-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      {showWordmark && (
        <div className="leading-none">
          <div className={`font-black font-heading tracking-tighter text-text-primary ${wordmarkSizes[size] || wordmarkSizes.md}`}>
            Schedora
          </div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-text-muted">
            Content & outreach workflows
          </div>
        </div>
      )}
    </div>
  );
}
