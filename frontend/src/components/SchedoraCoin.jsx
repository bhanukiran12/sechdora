export default function SchedoraCoin({ size = 24, className = "", animated = false, glow = false, rainbow = false, bounce = false, whiteBg = false }) {
  let extraClass = "";
  if (animated) extraClass += " schedora-coin-spin";
  if (glow) extraClass += " schedora-coin-glow";
  if (rainbow) extraClass += " schedora-coin-rainbow";
  if (bounce) extraClass += " schedora-coin-bounce";
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`${extraClass} ${className}`}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", borderRadius: "50%" }}
    >
      {whiteBg && <circle cx="32" cy="32" r="32" fill="white" />}
      {whiteBg && <circle cx="32" cy="32" r="30" fill="white" stroke="#111111" strokeWidth="2" />}
      <defs>
        <radialGradient id="sch-coin-rim" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd1f2" />
          <stop offset="55%" stopColor="#ff4fd8" />
          <stop offset="100%" stopColor="#7d63ff" />
        </radialGradient>
        <radialGradient id="sch-coin-face" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fff5fb" />
          <stop offset="55%" stopColor="#ffd1e8" />
          <stop offset="100%" stopColor="#ff8a3d" />
        </radialGradient>
        <linearGradient id="sch-coin-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7d63ff" />
          <stop offset="55%" stopColor="#ff4fd8" />
          <stop offset="100%" stopColor="#ff8a3d" />
        </linearGradient>
        <linearGradient id="sch-coin-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer rim — Schedora gradient (no more gold) */}
      <circle cx="32" cy="32" r="30" fill="url(#sch-coin-rim)" stroke="#111111" strokeWidth="2.5" />
      {/* Inner face */}
      <circle cx="32" cy="32" r="25" fill="url(#sch-coin-face)" stroke="#111111" strokeWidth="1.5" />
      {/* Decorative inner ring */}
      <circle cx="32" cy="32" r="22" fill="none" stroke="#7d63ff" strokeWidth="0.8" strokeDasharray="1.5 1.2" opacity="0.5" />

      {/* Schedora robot mark — same shapes as the brand logo */}
      <g transform="translate(32 32) scale(0.55) translate(-32 -32)">
        {/* Antenna */}
        <path d="M32 12 L46 7" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="47" cy="7" r="3" fill="#FFD84D" stroke="#111111" strokeWidth="1.2" />
        {/* Robot head */}
        <rect x="12" y="14" width="40" height="26" rx="9" fill="url(#sch-coin-body)" stroke="#111111" strokeWidth="2" />
        {/* Screen */}
        <rect x="17" y="19" width="30" height="16" rx="6" fill="#FFFFFF" stroke="#111111" strokeWidth="1.2" />
        {/* Eyes */}
        <circle cx="25" cy="27" r="2.5" fill="#111111" />
        <circle cx="39" cy="27" r="2.5" fill="#111111" />
      </g>

      {/* Top-left highlight */}
      <ellipse cx="22" cy="20" rx="11" ry="6" fill="url(#sch-coin-shine)" />
    </svg>
  );
}
