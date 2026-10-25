// Decorative pixel sky for the Home hero: sun (or moon at night), stars at night, and a few drifting clouds.
function Cloud({ top, delay, scale = 1 }: { top: string; delay: string; scale?: number }) {
  return (
    <div aria-hidden className="scene-cloud absolute left-0" style={{ top, animationDelay: delay, transform: `scale(${scale})` }}>
      <div className="relative h-8 w-24">
        <span className="absolute left-4 top-0 h-4 w-12 bg-white/70" />
        <span className="absolute left-0 top-4 h-4 w-24 bg-white/70" />
        <span className="absolute left-8 top-[-8px] h-4 w-8 bg-white/70" />
      </div>
    </div>
  );
}

export function PixelScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="scene-stars absolute left-0 top-4" />
      <span className="absolute right-[12%] top-[14%] h-14 w-14 border-[3px] border-edge" style={{ background: 'var(--sun)' }} />
      <Cloud top="18%" delay="-6s" />
      <Cloud top="34%" delay="-24s" scale={0.8} />
      <Cloud top="10%" delay="-32s" scale={1.2} />
    </div>
  );
}
