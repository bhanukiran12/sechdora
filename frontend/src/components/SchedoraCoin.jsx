export default function SchedoraCoin({ size = 24, className = "", animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`${animated ? "schedora-coin-spin" : ""} ${className}`}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        {/* Outer gold rim */}
        <radialGradient id="coin-rim" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe27a" />
          <stop offset="55%" stopColor="#ffb43d" />
          <stop offset="100%" stopColor="#c97318" />
        </radialGradient>
        {/* Coin face */}
        <radialGradient id="coin-face" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="55%" stopColor="#ffd44d" />
          <stop offset="100%" stopColor="#f59312" />
        </radialGradient>
        {/* Inner shine */}
        <linearGradient id="coin-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Schedora robot body gradient */}
        <linearGradient id="coin-robot-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7d63ff" />
          <stop offset="55%" stopColor="#4f8df7" />
          <stop offset="100%" stopColor="#2ee6b7" />
        </linearGradient>
      </defs>

      {/* Outer rim with thick black stroke (brutalist) */}
      <circle cx="32" cy="32" r="30" fill="url(#coin-rim)" stroke="#111111" strokeWidth="2.5" />
      {/* Inner coin face */}
      <circle cx="32" cy="32" r="25" fill="url(#coin-face)" stroke="#111111" strokeWidth="1.5" />
      {/* Decorative inner ring */}
      <circle cx="32" cy="32" r="22" fill="none" stroke="#c97318" strokeWidth="0.8" strokeDasharray="1.5 1.2" opacity="0.6" />

      {/* Schedora mini robot — simplified for coin face */}
      <g transform="translate(32 32) scale(0.32) translate(-60 -60)">
        {/* Robot head */}
        <rect x="22" y="28" width="76" height="58" rx="22" fill="#ffffff" stroke="#2e2f55" strokeWidth="3.5" />
        {/* Screen */}
        <rect x="30" y="38" width="60" height="38" rx="13" fill="#172554" />
        {/* Eyes */}
        <circle cx="46" cy="56" r="6.5" fill="#72f5ff" />
        <circle cx="74" cy="56" r="6.5" fill="#72f5ff" />
        {/* Smile */}
        <path d="M52 64 C56 70, 64 70, 68 64" stroke="#72f5ff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {/* Antenna */}
        <path d="M60 28 C68 20, 74 14, 82 10" stroke="url(#coin-robot-body)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="86" cy="10" r="6" fill="#ff8a3d" stroke="#111111" strokeWidth="1.5" />
      </g>

      {/* Top-left highlight */}
      <ellipse cx="22" cy="20" rx="11" ry="6" fill="url(#coin-shine)" />
    </svg>
  );
}
