import { CLOUDS, FAR_RANGE, MH, MW, NEAR_RANGE } from './landscape';

// The Home hero landscape: sky bands (from CSS), sun or moon, stars at night, drifting clouds, and two mountain ranges.
function Mountains({ rects, className }: { rects: { x: number; y: number; h: number; fill: string }[]; className: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${MW} ${MH}`} shapeRendering="crispEdges" preserveAspectRatio="xMidYMax slice" className={`absolute inset-x-0 w-full ${className}`}>
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={1} height={r.h} fill={r.fill} />)}
    </svg>
  );
}

function Cloud({ n, top, delay, duration, width }: { n: number; top: string; delay: string; duration: string; width: number }) {
  const c = CLOUDS[n];
  return (
    <svg aria-hidden viewBox={`0 0 ${c.w} ${c.h}`} shapeRendering="crispEdges" className="scene-cloud absolute left-0"
      style={{ top, width, animationDelay: delay, animationDuration: duration }}>
      {c.rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
    </svg>
  );
}

// A round pixel-art moon (or sun in the light theme): an outlined disc with a lit rim and a few craters.
const ORB = 21;
const ORB_RECTS = (() => {
  const c = ORB / 2;
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  const craters: [number, number, number][] = [[7, 7, 2.1], [13.5, 11.5, 2.6], [8.5, 14.5, 1.6], [14, 5.5, 1.3]];
  for (let y = 0; y < ORB; y++) {
    let x = 0;
    while (x < ORB) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const kind = (px: number, py: number): string => {
        const dd = Math.hypot(px + 0.5 - c, py + 0.5 - c);
        if (dd > 10.3) return '';
        if (dd > 9.3) return 'var(--sun-edge)';
        if (craters.some(([cx, cy, r]) => Math.hypot(px + 0.5 - cx, py + 0.5 - cy) <= r)) return 'var(--crater)';
        if ((px - c) * 0.7 + (py - c) * 0.7 < -5.5 && dd > 6.5) return 'var(--sun-hi)';   // lit upper-left rim
        return 'var(--sun)';
      };
      void d;
      const k = kind(x, y);
      if (!k) { x++; continue; }
      let w = 1;
      while (x + w < ORB && kind(x + w, y) === k) w++;
      rects.push({ x, y, w, fill: k });
      x += w;
    }
  }
  return rects;
})();

function Orb() {
  return (
    <svg aria-hidden viewBox={`0 0 ${ORB} ${ORB}`} shapeRendering="crispEdges" className="absolute right-[10%] top-[10%] h-24 w-24">
      {ORB_RECTS.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
    </svg>
  );
}

export function PixelScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="scene-stars absolute left-0 top-4" />
      <Orb />
      <Cloud n={0} top="8%" delay="-10s" duration="90s" width={230} />
      <Cloud n={2} top="26%" delay="-55s" duration="130s" width={300} />
      <Cloud n={1} top="40%" delay="-30s" duration="110s" width={170} />
      <Cloud n={0} top="52%" delay="-75s" duration="100s" width={190} />
      <Mountains rects={FAR_RANGE} className="bottom-[88px]" />
      <Mountains rects={NEAR_RANGE} className="bottom-[88px]" />
    </div>
  );
}
