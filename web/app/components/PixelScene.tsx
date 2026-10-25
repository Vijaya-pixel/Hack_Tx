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

export function PixelScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="scene-stars absolute left-0 top-4" />
      <span className="absolute right-[10%] top-[12%] h-16 w-16 border-[3px]" style={{ background: 'var(--sun)', borderColor: 'var(--sun-edge)' }} />
      <Cloud n={0} top="8%" delay="-10s" duration="90s" width={230} />
      <Cloud n={2} top="26%" delay="-55s" duration="130s" width={300} />
      <Cloud n={1} top="40%" delay="-30s" duration="110s" width={170} />
      <Cloud n={0} top="52%" delay="-75s" duration="100s" width={190} />
      <Mountains rects={FAR_RANGE} className="bottom-[88px]" />
      <Mountains rects={NEAR_RANGE} className="bottom-[88px]" />
    </div>
  );
}
