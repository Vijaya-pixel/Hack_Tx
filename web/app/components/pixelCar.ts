// A cartoon pixel-art GT coupe (very low nose, bubble roof into a ducktail, big silver multi-spoke wheels over blue
// brake calipers) on a 100x34 grid, facing right. It is generated in code and drawn as crisp SVG squares.
// The body is one still sprite; the spokes are drawn in rotation frames that are cycled to look like spinning,
// over a static brake disc and caliper. Original art, no logos.
// Palette keys: K outline, R body, L highlight, D shade, G black trim, A brake disc, C caliper, W glass, V glass shine,
// T tire, U tread, S silver spokes, H trim detail, P rim lip, Y headlight, F glint, O tail light, N white, x ground shadow.
export const W = 100;
export const H = 34;
export const WHEEL = 17;                                  // wheel sprite size
export const WHEEL_CENTERS: [number, number][] = [[20, 24], [79, 24]];
export const WHEEL_ANGLES = [0, 10, 20, 30, 40, 50];      // six spokes repeat every 60 degrees

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
// body (drawn from a GT-coupe side profile, mirrored to face right): very low nose, long hood, bubble roof sweeping
// back into a ducktail, flared fenders, low side sill
fillPoly([[2, 29], [1, 22], [1, 16], [4, 14], [11, 11], [20, 8], [30, 5], [43, 4], [50, 5], [55, 8], [60, 11], [70, 12], [80, 13], [86, 14], [94, 16], [98, 19], [99, 24], [98, 29]], 'R');
// carbon roof panel above the glass
rect(34, 4, 49, 5, 'G', 'R');
// greenhouse glass with a shine
fillPoly([[56, 13.7], [48, 6.6], [40, 5.2], [32, 6.2], [28.5, 9], [31, 13.7]], 'W');
for (const [x, y] of [[45, 8], [44, 9], [43, 10], [42, 11], [36, 8], [35, 9], [34, 10]] as Pt[]) if (grid[y][x] === 'W') grid[y][x] = 'V';
// black roof and pillars around the glass (red body only below the beltline)
for (let y = 0; y <= 13; y++) for (let x = 26; x <= 62; x++) if (grid[y][x] === 'R') grid[y][x] = 'G';
// a thin highlight along the top of the roof so the dome reads clearly
for (let x = 33; x <= 52; x++) { const col = grid.findIndex((r) => r[x] === 'G'); if (col >= 0 && grid[col + 1]?.[x] === 'G') grid[col + 1][x] = 'H'; }
// light along the shoulder line and hood, shade lower down with a dithered edge, then the black sill
rect(3, 14, 28, 14, 'L', 'R'); rect(57, 14, 93, 14, 'L', 'R'); rect(62, 12, 84, 12, 'L', 'R');
rect(3, 23, 98, 25, 'D', 'R');
for (let x = 3; x < 98; x += 2) if (grid[22][x] === 'R') grid[22][x] = 'D';
rect(2, 26, 98, 29, 'G', 'R');
// curved door: front and rear edges, handle, small mirror at the base of the A-pillar
rect(55, 15, 55, 24, 'K'); rect(54, 24, 54, 25, 'K');
rect(29, 15, 29, 17, 'K'); rect(30, 18, 30, 21, 'K'); rect(31, 22, 31, 25, 'K');
rect(45, 17, 49, 17, 'L'); rect(45, 18, 49, 18, 'D');
rect(50, 12, 53, 13, 'G');
// slatted side vent along the sill
rect(56, 27, 57, 28, 'P'); rect(59, 27, 60, 28, 'P'); rect(62, 27, 63, 28, 'P'); rect(65, 27, 66, 28, 'P');
rect(54, 27, 54, 28, 'K');
// nose: slim LED headlight with a glint, dark lower intake with slats, front splitter
rect(90, 17, 97, 18, 'Y'); rect(92, 17, 96, 17, 'F');
rect(93, 21, 98, 25, 'G'); for (const y of [22, 24]) rect(93, y, 98, y, 'H');
rect(95, 29, 99, 29, 'G'); rect(97, 30, 99, 30, 'G');
// tail: ducktail flick, vented light cluster, diffuser
rect(1, 13, 8, 13, 'G'); rect(1, 14, 4, 14, 'L', 'R');
rect(1, 17, 2, 19, 'O'); rect(2, 20, 6, 24, 'G'); for (const y of [21, 23]) rect(2, y, 6, y, 'H');
rect(2, 29, 14, 29, 'G');
// wheel arches: dark openings where the big wheels sit
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
        else if (d > 5.6) ch = ang % 60 < 14 ? 'U' : 'T';          // six tread blocks that turn with the wheel
        else if (d > 4.6) ch = 'P';                                  // rim lip
        else {
          const nearest = ((ang % 60) + 60) % 60;
          const delta = Math.min(nearest, 60 - nearest) * (Math.PI / 180);
          if (d * Math.sin(delta) < 0.85 && d > 1.4) ch = 'S';       // spokes
          else if (d <= 1.4) ch = d > 0.6 ? 'S' : 'K';                // hub
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
  W: { fill: '#8fd0ff' }, V: { fill: '#e6f6ff' }, T: { fill: '#1d1d23' }, U: { fill: '#34343c' }, H: { fill: '#3b3b44' }, P: { fill: '#b4b8c2' }, S: { fill: '#e6e9f0' },
  Y: { fill: '#ffe27a' }, F: { fill: '#fffbe0' }, O: { fill: '#ff9a1f' }, N: { fill: '#f4f1ea' }, x: { fill: '#000000', opacity: 0.22 },
};
