// A cartoon pixel-art sports coupe (long low hood, fastback roof, slim headlights, black five-spoke wheels with blue
// brake calipers) on a 100x34 grid, facing right. It is generated in code and drawn as crisp SVG squares.
// The body is one still sprite; the spokes are drawn in rotation frames that are cycled to look like spinning,
// over a static brake disc and caliper. Original art, no logos.
// Palette keys: K outline, R body, L highlight, D shade, G black trim, A brake disc, C caliper, W glass, V glass shine,
// T tire, U tread, H spokes, P rim lip, Y headlight, F glint, O tail light, N white, x ground shadow.
export const W = 100;
export const H = 34;
export const WHEEL = 17;                                  // wheel sprite size
export const WHEEL_CENTERS: [number, number][] = [[24, 24], [76, 24]];
export const WHEEL_ANGLES = [0, 12, 24, 36, 48, 60];      // five spokes repeat every 72 degrees

type Pt = [number, number];
const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('.'));

const inPoly = (x: number, y: number, poly: Pt[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const fillPoly = (poly: Pt[], c: string, only?: string) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly(x + 0.5, y + 0.5, poly) && (!only || grid[y][x] === only)) grid[y][x] = c;
};
const rect = (x0: number, y0: number, x1: number, y1: number, c: string, only?: string) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!only || grid[y][x] === only) grid[y][x] = c;
};
const circle = (cx: number, cy: number, r: number, c: string, only?: string) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r && (!only || grid[y][x] === only)) grid[y][x] = c;
};

// ground shadow
rect(10, 32, 92, 33, 'x');
// body: short ducktail, fastback roofline rising to a low roof, raked windshield, long low hood, rounded nose
fillPoly([[3, 26], [3, 17], [6, 14], [14, 12], [24, 8], [34, 5], [46, 4], [56, 5], [62, 8], [66, 10], [70, 11], [82, 11], [90, 14], [96, 18], [98, 23], [97, 26]], 'R');
// greenhouse glass with a door pillar and a shine
fillPoly([[29, 13], [34, 7], [44, 5.6], [56, 6.2], [62, 9], [66, 13]], 'W');
rect(46, 6, 47, 13, 'K');
for (const [x, y] of [[36, 9], [37, 10], [38, 11], [39, 12], [50, 8], [51, 9], [52, 10], [53, 11]] as Pt[]) if (grid[y][x] === 'W') grid[y][x] = 'V';
// light along the roof, beltline, ducktail and hood crease
rect(34, 4, 56, 4, 'L', 'R'); rect(6, 14, 28, 14, 'L', 'R'); rect(3, 15, 8, 15, 'L', 'R'); rect(70, 11, 82, 11, 'L', 'R'); rect(83, 12, 90, 14, 'L', 'R');
// lower-body shading with a dithered edge, then black sill and splitter
rect(3, 21, 97, 23, 'D', 'R');
for (let x = 3; x < 97; x += 2) if (grid[20][x] === 'R') grid[20][x] = 'D';
rect(3, 24, 97, 26, 'G', 'R');
// door seam, handle, mirror, side vent
rect(47, 14, 47, 22, 'K'); rect(33, 14, 33, 22, 'K');
rect(40, 17, 43, 17, 'L'); rect(40, 18, 43, 18, 'D');
rect(64, 11, 68, 13, 'G'); rect(64, 11, 68, 11, 'H');
rect(57, 17, 62, 20, 'G'); for (const y of [18, 20]) rect(57, y, 62, y, 'H');
// bonnet vent
rect(73, 12, 81, 13, 'G'); rect(74, 12, 80, 12, 'H');
// nose: slim LED headlight with a glint, big dark lower intake with slats
rect(86, 17, 95, 18, 'Y'); rect(88, 17, 93, 17, 'F');
rect(88, 21, 97, 25, 'G'); for (const y of [22, 24]) rect(89, y, 97, y, 'H');
// tail: light bar, exhausts, diffuser
rect(3, 17, 4, 21, 'O'); rect(3, 22, 4, 22, 'D');
rect(2, 24, 5, 25, 'P'); rect(3, 26, 14, 26, 'G');
// wheel arches: dark openings where the wheels sit
for (const [cx, cy] of WHEEL_CENTERS) {
  circle(cx, cy, 9.3, 'G', 'R');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= 8.7 ** 2 && grid[y][x] !== '.' && grid[y][x] !== 'x') grid[y][x] = 'A';
}

// outline: any body pixel that touches empty space becomes K
const out = grid.map((r) => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = grid[y][x];
  if (c === '.' || c === 'x') continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const n = grid[y + dy]?.[x + dx] ?? '.';
    if (n === '.' || n === 'x') { out[y][x] = 'K'; break; }
  }
}
export const BODY: string[] = out.map((r) => r.join(''));

// Static layer under the spokes: dark brake disc with a blue caliper that does not rotate.
export const WHEEL_STATIC: string[] = (() => {
  const c = WHEEL / 2;
  return Array.from({ length: WHEEL }, (_, y) => Array.from({ length: WHEEL }, (_, x) => {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    if (d > 4.3) return '.';
    return d > 2.4 && deg > 15 && deg < 85 ? 'C' : 'A';
  }).join(''));
})();

// One wheel at a given rotation: tire with tread blocks, rim lip, five black spokes. Gaps between spokes stay clear,
// so the brake disc and caliper show through.
function wheelFrame(deg: number): string[] {
  const c = WHEEL / 2;
  const rows: string[] = [];
  for (let y = 0; y < WHEEL; y++) {
    let row = '';
    for (let x = 0; x < WHEEL; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      const ang = ((Math.atan2(dy, dx) * 180) / Math.PI - deg + 720) % 360;
      let ch = '.';
      if (d <= 8.3) {
        if (d > 7.4) ch = 'K';
        else if (d > 5.6) ch = ang % 72 < 16 ? 'U' : 'T';          // five tread blocks that turn with the wheel
        else if (d > 4.6) ch = 'P';                                  // rim lip
        else {
          const nearest = ((ang % 72) + 72) % 72;
          const delta = Math.min(nearest, 72 - nearest) * (Math.PI / 180);
          if (d * Math.sin(delta) < 0.9 && d > 1.2) ch = 'H';       // spokes
          else if (d <= 1.2) ch = 'H';                                // hub
        }
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}
export const WHEEL_FRAMES: string[][] = WHEEL_ANGLES.map(wheelFrame);

export const PALETTE: Record<string, { fill: string; opacity?: number }> = {
  K: { fill: '#16161a' }, R: { fill: '#e8112a' }, L: { fill: '#ff7a86' }, D: { fill: '#a30a1c' }, G: { fill: '#232329' }, A: { fill: '#101014' }, C: { fill: '#2f6bff' },
  W: { fill: '#8fd0ff' }, V: { fill: '#e6f6ff' }, T: { fill: '#1d1d23' }, U: { fill: '#34343c' }, H: { fill: '#3b3b44' }, P: { fill: '#8a8c96' },
  Y: { fill: '#ffe27a' }, F: { fill: '#fffbe0' }, O: { fill: '#ff9a1f' }, N: { fill: '#f4f1ea' }, x: { fill: '#000000', opacity: 0.22 },
};
