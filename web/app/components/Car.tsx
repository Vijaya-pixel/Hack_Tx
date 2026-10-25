import { H, PALETTE, PIXEL_CAR, W } from './pixelCar';

// Horizontal runs of the same colour become one rectangle each, so the SVG stays small.
const RECTS = (() => {
  const out: { x: number; y: number; w: number; c: string }[] = [];
  PIXEL_CAR.forEach((row, y) => {
    let x = 0;
    while (x < W) {
      const c = row[x];
      let w = 1;
      while (x + w < W && row[x + w] === c) w++;
      if (c !== '.') out.push({ x, y, w, c });
      x += w;
    }
  });
  return out;
})();

// The demo customer's car: a cartoon pixel-art compact SUV, drawn from a grid in pixelCar.ts. Original art, no logos.
export function Car({ className = '' }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pixel-art illustration of a red compact SUV" shapeRendering="crispEdges"
      className={`h-auto w-full select-none ${className}`}>
      {RECTS.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={PALETTE[r.c].fill} fillOpacity={PALETTE[r.c].opacity ?? 1} />
      ))}
    </svg>
  );
}
