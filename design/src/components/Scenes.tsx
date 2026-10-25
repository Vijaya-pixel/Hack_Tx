import { CharacterArt, Character, Compass } from './Character';
import { NameTag } from './ui';
import { CAST, ME, type Friend } from '../data';

const ROCK = '#6B7A99';
const ROCK_DARK = '#58668A';
const SNOW = '#F7FBFF';
const MEADOW = '#7CC57A';
const PINE = '#2F8F6B';
const INK = '#17324D';

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-6} width={6} height={10} fill="#9D6B34" />
      <path d="M0 -46 L16 -18 H8 L20 -4 H-20 L-8 -18 H-16 Z" fill={PINE} />
    </g>
  );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={SNOW}>
      <rect x={-46} y={-8} width={92} height={22} rx={11} />
      <circle cx={-14} cy={-10} r={16} />
      <circle cx={12} cy={-14} r={20} />
    </g>
  );
}

function Peak({ base, apex, w, cap = 0.3 }: { base: number; apex: [number, number]; w: number; cap?: number }) {
  const [ax, ay] = apex;
  const h = base - ay;
  const cy = ay + h * cap;
  const cx1 = ax - (w / 2) * cap;
  const cx2 = ax + (w / 2) * cap;
  return (
    <g>
      <path d={`M${ax - w / 2} ${base} L${ax} ${ay} L${ax + w / 2} ${base} Z`} fill={ROCK} />
      <path d={`M${ax} ${ay} L${ax + w / 2} ${base} L${ax + w * 0.12} ${base} Z`} fill={ROCK_DARK} />
      <path d={`M${ax} ${ay} L${cx2} ${cy} L${ax + 8} ${cy - 8} L${ax - 6} ${cy + 2} L${ax - 16} ${cy - 6} L${cx1} ${cy} Z`} fill={SNOW} />
    </g>
  );
}

function Flag({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V-62" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path d="M2 -62 H40 L31 -50 L40 -38 H2 Z" fill="#E8458B" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={0} cy={-64} r={4} fill="#FFC72C" stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

const placeOn = (f: Friend, x: number, y: number, h: number, key: string) => {
  const s = h / 190;
  return (
    <g key={key} transform={`translate(${x - 70 * s} ${y - 182 * s}) scale(${s})`}>
      <CharacterArt {...f.character} uid={`w-${key}`} />
    </g>
  );
};

export function WelcomeScene() {
  const [a, b, c, d] = CAST;
  const peaks = [
    { f: a, base: 300, apex: [150, 176] as [number, number], w: 250, label: 'Seattle', lx: 272, ly: 112 },
    { f: b, base: 300, apex: [650, 168] as [number, number], w: 260, label: 'Austin', lx: 532, ly: 104 },
    { f: c, base: 620, apex: [150, 452] as [number, number], w: 290, label: 'Chicago', lx: 276, ly: 388 },
    { f: d, base: 620, apex: [650, 446] as [number, number], w: 290, label: 'Atlanta', lx: 524, ly: 382 },
  ];
  return (
    <svg className="scene scene--welcome" viewBox="0 0 800 620" role="img" aria-label="Four friends stand on four mountain peaks in Seattle, Austin, Chicago and Atlanta. Dotted trails lead from each peak to a flag in the middle.">
      <rect x={0} y={0} width={800} height={620} rx={36} fill="#CDEAF8" />
      <circle cx={400} cy={86} r={42} fill="#FFC72C" />
      <Cloud x={52} y={64} s={0.6} />
      <Cloud x={750} y={50} s={0.55} />
      <Cloud x={400} y={196} s={0.7} />
      <path d="M0 282 Q200 262 400 282 T800 278 V584 Q800 620 764 620 H36 Q0 620 0 584 Z" fill={MEADOW} />
      {peaks.slice(0, 2).map((p) => <Peak key={p.label} base={p.base} apex={p.apex} w={p.w} />)}
      <path d="M0 400 Q260 360 400 386 T800 386 V584 Q800 620 764 620 H36 Q0 620 0 584 Z" fill="#6CB86B" />
      <Pine x={300} y={318} s={0.8} /><Pine x={326} y={308} s={0.6} /><Pine x={506} y={322} s={0.75} />
      <g fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeDasharray="1 13">
        <path d="M232 302 Q320 350 388 390" />
        <path d="M572 302 Q480 350 412 390" />
        <path d="M262 540 Q330 450 388 410" />
        <path d="M540 534 Q470 450 412 410" />
      </g>
      {peaks.slice(2).map((p) => <Peak key={p.label} base={p.base} apex={p.apex} w={p.w} />)}
      <Pine x={300} y={600} /><Pine x={500} y={604} s={0.9} /><Pine x={528} y={610} s={0.7} />
      <ellipse cx={400} cy={402} rx={62} ry={16} fill={PINE} />
      <Flag x={400} y={398} s={1.15} />
      {peaks.map((p) => placeOn(p.f, p.apex[0], p.apex[1] + 6, 132, p.label))}
      {peaks.map((p) => (
        <g key={`l-${p.label}`}>
          <rect x={p.lx - 62} y={p.ly - 22} width={124} height={40} rx={20} fill={SNOW} />
          <text x={p.lx} y={p.ly + 6} textAnchor="middle" fontFamily="Figtree Variable, sans-serif" fontWeight={800} fontSize={21} fill={INK}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function BaseCampBackdrop() {
  return (
    <svg className="basecamp__backdrop" viewBox="0 0 960 440" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width={960} height={440} fill="#CDEAF8" />
      <circle cx={812} cy={74} r={36} fill="#FFC72C" />
      <Cloud x={170} y={70} s={0.9} />
      <Cloud x={640} y={110} s={0.7} />
      <Peak base={300} apex={[180, 150]} w={360} cap={0.26} />
      <Peak base={300} apex={[790, 140]} w={380} cap={0.26} />
      <Peak base={300} apex={[480, 46]} w={520} cap={0.3} />
      <Flag x={480} y={48} s={0.9} />
      <path d="M0 280 Q240 250 480 274 T960 268 V440 H0 Z" fill={MEADOW} />
      <Pine x={60} y={300} s={1.2} /><Pine x={100} y={292} s={0.9} /><Pine x={880} y={300} s={1.2} /><Pine x={918} y={292} s={0.8} />
      <Pine x={300} y={282} s={0.7} /><Pine x={660} y={282} s={0.7} />
      <ellipse cx={480} cy={398} rx={330} ry={40} fill="#6CB86B" />
      <g transform="translate(480 392)">
        <ellipse cx={0} cy={6} rx={52} ry={10} fill="#58668A" opacity={0.35} />
        <rect x={-42} y={-6} width={84} height={14} rx={7} fill="#9D6B34" transform="rotate(12)" />
        <rect x={-42} y={-6} width={84} height={14} rx={7} fill="#C48A4A" transform="rotate(-12)" />
        <path className="fire fire--outer" d="M0 -78 C18 -52 34 -38 28 -14 C24 2 -24 2 -28 -14 C-34 -36 -14 -46 0 -78 Z" fill="#E8458B" />
        <path className="fire fire--inner" d="M0 -50 C10 -34 18 -26 14 -12 C10 -2 -10 -2 -14 -12 C-17 -24 -8 -32 0 -50 Z" fill="#FFC72C" />
      </g>
    </svg>
  );
}

const SPOTS: { left: string; bottom: string; size: number }[] = [
  { left: '20%', bottom: '7%', size: 172 },
  { left: '36%', bottom: '17%', size: 150 },
  { left: '64%', bottom: '17%', size: 150 },
  { left: '80%', bottom: '7%', size: 172 },
];
const SPOTS_MOBILE: { left: string; bottom: string; size: number }[] = [
  { left: '13%', bottom: '7%', size: 100 },
  { left: '36%', bottom: '19%', size: 92 },
  { left: '64%', bottom: '19%', size: 92 },
  { left: '87%', bottom: '7%', size: 100 },
];

export function BaseCampScene({ mobile, members = CAST, guide }: { mobile?: boolean; members?: Friend[]; guide?: React.ReactNode }) {
  const order = [members[0], members[1], members[2], members[3]].filter(Boolean);
  return (
    <div className={`basecamp${mobile ? ' basecamp--mobile' : ''}`} role="img" aria-label={`Base Camp: ${order.map((m) => m.name).join(', ')} stand around the campfire below a peak with a flag.`}>
      <BaseCampBackdrop />
      {order.map((m, i) => {
        const spot = order.length === 1 ? { left: '35%', bottom: '14%', size: mobile ? 110 : 172 } : (mobile ? SPOTS_MOBILE : SPOTS)[i];
        return (
          <div key={m.id} className="basecamp__member" style={{ left: spot.left, bottom: spot.bottom }}>
            <Character {...m.character} size={spot.size} />
            <NameTag friend={m} you={m.id === ME.id} compact={mobile} />
          </div>
        );
      })}
      {guide && <div className="basecamp__guide">{guide}</div>}
    </div>
  );
}

export function RevealStage({ friend: f, animate = true, size = 260 }: { friend: Friend; animate?: boolean; size?: number }) {
  return (
    <div className={`reveal-stage${animate ? ' is-animated' : ''}`} style={{ ['--stage' as string]: `${size * 1.55}px` }}>
      <svg className="reveal-stage__confetti" viewBox="0 0 400 400" aria-hidden="true">
        <path d="M60 90 l16 -6 l-4 16 z" fill="#E8458B" />
        <rect x={322} y={80} width={14} height={14} rx={3} fill="#FFC72C" transform="rotate(20 329 87)" />
        <circle cx={350} cy={250} r={7} fill="#2F8F6B" />
        <path d="M40 260 l14 4 l-10 10 z" fill="#FFC72C" />
        <rect x={88} y={330} width={12} height={12} rx={3} fill="#7CC57A" transform="rotate(-18 94 336)" />
        <path d="M300 340 l16 2 l-8 13 z" fill="#E8458B" />
        <circle cx={200} cy={28} r={6} fill="#E8458B" />
      </svg>
      <div className="reveal-stage__circle" />
      <div className="reveal-stage__char">
        <Character {...f.character} pose="jumping" size={size} label={`${f.name}, ${f.character.title}`} />
      </div>
    </div>
  );
}

export function GuideTip({ children, mood = 'happy' }: { children: React.ReactNode; mood?: 'happy' | 'thinking' }) {
  return (
    <div className="guide-tip">
      <Compass size={64} mood={mood} />
      <div className="bubble">{children}</div>
    </div>
  );
}
