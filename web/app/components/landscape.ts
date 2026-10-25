// Pixel-art scenery generated on a grid: mountain ranges and clouds, drawn as crisp SVG squares.
// Fill colours come from CSS variables, so the same sprites work in the day and night themes.
export const MW = 320;   // mountain grid width
export const MH = 70;    // mountain grid height

const peak = (x: number, cx: number, h: number, w: number) => Math.max(0, h * (1 - Math.abs(x - cx) / w));
// Small chunky roughness: pairs of columns share a value so the ridge looks stepped, not noisy.
const wob = (x: number, seed: number) => Math.round(Math.sin(Math.floor(x / 2) * 1.3 + seed) * 0.9);

// One mountain range. Heights come from a smooth function; the lit top rows are a band, and the shaded (descending)
// side is decided from the smooth slope so it forms clean diagonal faces.
function range(heights: (x: number) => number, seed: number, base: string, light: string, shade: string) {
  const rects: { x: number; y: number; h: number; fill: string }[] = [];
  for (let x = 0; x < MW; x++) {
    const smooth = heights(x);
    const h = Math.max(2, Math.round(smooth) + wob(x, seed));
    const top = MH - h;
    const lit = Math.min(2, h);
    const descending = heights(x) < heights(x - 3);
    rects.push({ x, y: top, h: lit, fill: light });
    if (h - lit > 0) rects.push({ x, y: top + lit, h: h - lit, fill: descending ? shade : base });
  }
  return rects;
}

export const FAR_RANGE = range((x) => Math.max(peak(x, 60, 30, 55), peak(x, 150, 24, 50), peak(x, 235, 34, 60), peak(x, 310, 26, 45), 12), 1.3, 'var(--mtn-far)', 'var(--mtn-far-hi)', 'var(--mtn-far-sh)');
export const NEAR_RANGE = range((x) => Math.max(peak(x, 28, 52, 46), peak(x, 300, 56, 50), peak(x, 165, 14, 60), 5), 4.1, 'var(--mtn-near)', 'var(--mtn-near-hi)', 'var(--mtn-near-sh)');

// A cloud: a union of circles, white on top and a cooler shade on the bottom two rows.
export interface CloudSprite { w: number; h: number; rects: { x: number; y: number; w: number; fill: string }[] }
export function cloud(blobs: [number, number, number][], w: number, h: number): CloudSprite {
  const filled = (x: number, y: number) => blobs.some(([cx, cy, r]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
  const rects: CloudSprite['rects'] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (!filled(x, y)) { x++; continue; }
      let run = 1;
      while (x + run < w && filled(x + run, y)) run++;
      const bottom = !filled(x, y + 1) || !filled(x, y + 2);
      rects.push({ x, y, w: run, fill: bottom ? 'var(--cloud2)' : 'var(--cloud1)' });
      x += run;
    }
  }
  return { w, h, rects };
}
export const CLOUDS: CloudSprite[] = [
  cloud([[8, 10, 6], [16, 8, 7.5], [25, 10, 6], [32, 12, 4.5], [14, 13, 5]], 38, 18),
  cloud([[6, 8, 4.5], [13, 6, 5.5], [20, 8, 4.5], [10, 10, 4]], 26, 13),
  cloud([[10, 12, 8], [21, 9, 9], [32, 12, 7.5], [41, 13, 5], [20, 15, 6]], 48, 22),
];
