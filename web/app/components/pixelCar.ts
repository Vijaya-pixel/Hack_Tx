// A cartoon pixel-art compact SUV, generated on a small grid (facing right) and drawn as crisp SVG squares.
// Letters are palette keys: K outline, R body, L highlight, D shade, G black cladding, W glass, V glass shine,
// T tire, S rim, H hub, Y headlight, O tail light, B roof rail, '.' empty, 'x' ground shadow.
export const W = 58;
export const H = 32;
const GROUND = 30;

type Pt = [number, number];
const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('.'));

function inPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function fillPoly(poly: Pt[], c: string, only?: string) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly(x + 0.5, y + 0.5, poly) && (!only || grid[y][x] === only)) grid[y][x] = c;
}
function fillCircle(cx: number, cy: number, r: number, c: string, only?: string) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r && (!only || grid[y][x] === only)) grid[y][x] = c;
}
function rect(x0: number, y0: number, x1: number, y1: number, c: string, only?: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!only || grid[y][x] === only) grid[y][x] = c;
}

const WHEELS: Pt[] = [[14, 23.5], [44, 23.5]];

// ground shadow
rect(6, GROUND, 52, GROUND + 1, 'x');
// roof rails
rect(11, 2, 33, 2, 'B'); rect(13, 3, 13, 3, 'B'); rect(31, 3, 31, 3, 'B');
// body silhouette: upright hatch at the rear (left), flat roof, raked windshield, short hood
fillPoly([[3, 24], [2, 21], [3, 12], [6, 6], [8, 4], [37, 4], [41, 5], [48, 12], [53, 13], [55, 16], [55, 24]], 'R');
// glass: rear pane, front pane
fillPoly([[7, 12], [8, 7], [10, 6], [22, 6], [22, 12]], 'W');
fillPoly([[24, 6], [36, 6], [39, 7], [45, 12], [24, 12]], 'W');
// glass shine
for (const [x, y] of [[11, 8], [12, 9], [13, 10], [14, 11], [27, 8], [28, 9], [29, 10], [30, 11]] as Pt[]) if (grid[y][x] === 'W') grid[y][x] = 'V';
// highlight along the roof and the beltline, black cladding low on the body
rect(8, 4, 37, 4, 'L', 'R'); rect(4, 13, 52, 13, 'L', 'R');
rect(3, 21, 55, 24, 'G', 'R');
// shade between the cladding and the beltline
rect(3, 20, 55, 20, 'D', 'R');
// door seams and handles
rect(23, 13, 23, 20, 'K'); rect(36, 13, 36, 20, 'K');
rect(19, 15, 21, 15, 'L'); rect(33, 15, 34, 15, 'L');
// lights
rect(52, 14, 54, 16, 'Y'); rect(2, 14, 3, 17, 'O');
// wheel arches cut into the body, then tires, rims, hubs
for (const [cx, cy] of WHEELS) fillCircle(cx, cy, 7.5, 'K', undefined);
for (const [cx, cy] of WHEELS) { fillCircle(cx, cy, 6.5, 'T'); fillCircle(cx, cy, 3.6, 'S'); fillCircle(cx, cy, 1.5, 'H'); }

// outline: any non-empty, non-shadow pixel that touches empty space becomes K
const out = grid.map((r) => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = grid[y][x];
  if (c === '.' || c === 'x' || c === 'B') continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const n = grid[y + dy]?.[x + dx] ?? '.';
    if (n === '.' || n === 'x') { if (c !== 'T') out[y][x] = 'K'; break; }
  }
}
export const PIXEL_CAR: string[] = out.map((r) => r.join(''));

export const PALETTE: Record<string, { fill: string; opacity?: number }> = {
  K: { fill: '#16161a' }, R: { fill: '#e8112a' }, L: { fill: '#ff6b78' }, D: { fill: '#a30a1c' }, G: { fill: '#2c2c33' },
  W: { fill: '#8fd0ff' }, V: { fill: '#e6f6ff' }, T: { fill: '#1b1b20' }, S: { fill: '#c9cbd2' }, H: { fill: '#5e6068' },
  Y: { fill: '#ffe27a' }, O: { fill: '#ff9a1f' }, B: { fill: '#55565e' }, x: { fill: '#000000', opacity: 0.22 },
};
