// An original, generic compact SUV in greys: tall body, upright hatchback rear (left), roof rails, big wheels. No logos.
export function Car() {
  const wheels = [[112, 140], [314, 140]];
  return (
    <svg viewBox="0 0 430 180" role="img" aria-label="Illustration of a compact SUV" className="w-full">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f6f6" /><stop offset="0.5" stopColor="#d9d9d9" /><stop offset="1" stopColor="#ababab" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#707070" /><stop offset="1" stopColor="#2c2c2c" />
        </linearGradient>
      </defs>
      <ellipse cx="215" cy="172" rx="182" ry="7" fill="#000" opacity="0.1" />
      {/* roof rails */}
      <path d="M82 33 L246 33" stroke="#7d7d7d" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M96 33 L96 40 M232 33 L232 40" stroke="#7d7d7d" strokeWidth="3" />
      {/* body: flat roof, near-vertical hatch at the rear, short hood */}
      <path d="M30 128 L30 78 Q30 66 36 58 L50 42 Q54 38 62 38 L258 38 Q270 38 278 45 L324 80 L384 88 Q402 92 402 108 L402 128 Z"
        fill="url(#body)" stroke="#8c8c8c" strokeWidth="1.5" />
      {/* side glass with pillars */}
      <path d="M62 48 L254 48 Q262 48 268 53 L304 80 L58 80 Z" fill="url(#glass)" />
      <path d="M150 47 L156 47 L156 82 L150 82 Z M226 47 L232 47 L232 82 L226 82 Z" fill="#c4c4c4" />
      {/* door lines, handles, lights, cladding */}
      <path d="M153 82 L153 122 M229 82 L229 122" stroke="#b0b0b0" strokeWidth="1.2" />
      <path d="M130 92 L146 92 M206 92 L222 92" stroke="#8c8c8c" strokeWidth="3" strokeLinecap="round" />
      <rect x="31" y="84" width="8" height="22" rx="3" fill="#bdbdbd" stroke="#8c8c8c" />
      <path d="M372 92 L398 96 L398 104 L372 102 Z" fill="#fafafa" stroke="#9a9a9a" />
      <path d="M34 118 L398 118 L398 128 L34 128 Z" fill="#8a8a8a" opacity="0.55" />
      {wheels.map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy - 6} r="40" fill="#6b6b6b" opacity="0.5" />
          <circle cx={cx} cy={cy} r="32" fill="#262626" />
          <circle cx={cx} cy={cy} r="21" fill="#dcdcdc" stroke="#8c8c8c" />
          <circle cx={cx} cy={cy} r="5" fill="#8c8c8c" />
          {[0, 72, 144, 216, 288].map((a) => (
            <line key={a} x1={cx} y1={cy} x2={cx + 19 * Math.cos((a * Math.PI) / 180)} y2={cy + 19 * Math.sin((a * Math.PI) / 180)} stroke="#8c8c8c" strokeWidth="2.5" />
          ))}
        </g>
      ))}
    </svg>
  );
}
