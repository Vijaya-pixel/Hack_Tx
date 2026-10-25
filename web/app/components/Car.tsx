// An original, generic compact hybrid SUV in greys. Not any real model, no logos.
export function Car() {
  return (
    <svg viewBox="0 0 420 170" role="img" aria-label="Illustration of a compact hybrid SUV" className="w-full">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f4f4" /><stop offset="0.55" stopColor="#d6d6d6" /><stop offset="1" stopColor="#a9a9a9" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d6d6d" /><stop offset="1" stopColor="#2b2b2b" />
        </linearGradient>
      </defs>
      <ellipse cx="210" cy="148" rx="170" ry="9" fill="#000" opacity="0.1" />
      <path d="M26 118 L26 100 Q26 90 38 86 L92 76 Q112 48 140 42 L262 42 Q282 42 294 54 L322 80 L366 88 Q384 92 386 106 L386 118 Z" fill="url(#body)" stroke="#8c8c8c" strokeWidth="1.5" />
      <path d="M118 74 L146 52 Q150 50 156 50 L204 50 L204 74 Z" fill="url(#glass)" />
      <path d="M212 50 L262 50 Q272 50 280 58 L304 74 L212 74 Z" fill="url(#glass)" />
      <path d="M205 50 L211 50 L211 76 L205 76 Z" fill="#bdbdbd" />
      <path d="M30 98 L384 98" stroke="#b5b5b5" strokeWidth="1.2" />
      <rect x="352" y="94" width="26" height="8" rx="4" fill="#fafafa" stroke="#9a9a9a" />
      <rect x="30" y="94" width="14" height="8" rx="4" fill="#cfcfcf" stroke="#9a9a9a" />
      <path d="M232 84 L252 84" stroke="#9a9a9a" strokeWidth="2.5" strokeLinecap="round" />
      {[[100, 122], [312, 122]].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r="33" fill="#fff" opacity="0.001" />
          <path d={`M${cx - 36} ${cy} A36 36 0 0 1 ${cx + 36} ${cy}`} fill="#8e8e8e" opacity="0.35" />
          <circle cx={cx} cy={cy} r="28" fill="#2a2a2a" />
          <circle cx={cx} cy={cy} r="17" fill="#d9d9d9" stroke="#8c8c8c" />
          <circle cx={cx} cy={cy} r="5" fill="#8c8c8c" />
          {[0, 72, 144, 216, 288].map((a) => (
            <line key={a} x1={cx} y1={cy} x2={cx + 15 * Math.cos((a * Math.PI) / 180)} y2={cy + 15 * Math.sin((a * Math.PI) / 180)} stroke="#8c8c8c" strokeWidth="2" />
          ))}
        </g>
      ))}
    </svg>
  );
}
