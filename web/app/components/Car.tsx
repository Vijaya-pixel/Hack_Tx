import { BODY, H, PALETTE, W, WHEEL, WHEEL_CENTERS, WHEEL_FRAMES, WHEEL_STATIC } from './pixelCar';

// Horizontal runs of the same colour become one rectangle each, so the SVG stays small.
function rects(rows: string[]) {
  const out: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w++;
      if (c !== '.') out.push({ x, y, w, c });
      x += w;
    }
  });
  return out;
}
const Pixels = ({ rows }: { rows: string[] }) => (
  <>{rects(rows).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={PALETTE[r.c].fill} fillOpacity={PALETTE[r.c].opacity ?? 1} />)}</>
);

// The demo customer's car: a cartoon pixel-art sports coupe drawn from a grid in pixelCar.ts (original art, no logos).
// The body bobs on its suspension and the wheels cycle through rotation frames; both stop for reduced-motion users.
export function Car({ className = '' }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pixel-art illustration of a red sports coupe" shapeRendering="crispEdges"
      className={`h-auto w-full select-none ${className}`}>
      <g className="car-body"><Pixels rows={BODY} /></g>
      {WHEEL_CENTERS.map(([cx, cy], w) => (
        <g key={w} transform={`translate(${cx - WHEEL / 2} ${cy - WHEEL / 2})`}>
          <Pixels rows={WHEEL_STATIC} />
          {WHEEL_FRAMES.map((frame, i) => (
            <g key={i} className={`wheel-frame wf${i}`} opacity={i === 0 ? 1 : 0}><Pixels rows={frame} /></g>
          ))}
        </g>
      ))}
    </svg>
  );
}
