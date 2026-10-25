import type { Accessory, BodyColor, Mood, Pose } from '../data';
import { BODY_COLORS } from '../data';

export const INK = '#17324D';
const WHITE = '#FFFFFF';
const BLUSH = '#FFB3CF';

export interface CharacterProps {
  color: BodyColor;
  accessory?: Accessory;
  mood?: Mood;
  pose?: Pose;
  size?: number;
  label?: string;
  className?: string;
}

interface ArtProps { color: BodyColor; accessory: Accessory; mood: Mood; pose: Pose; uid: string }

type Pt = [number, number];
interface Rig { left: Pt; right: Pt; leftElbow?: Pt; rightElbow?: Pt; lift: number; tilt: number; tuck: boolean; look: Pt }

const SHOULDER_L: Pt = [36, 104];
const SHOULDER_R: Pt = [104, 104];

const RIGS: Record<Pose, Rig> = {
  standing: { left: [26, 128], right: [114, 128], lift: 0, tilt: 0, tuck: false, look: [0, 1] },
  waving: { left: [26, 128], right: [126, 62], rightElbow: [124, 92], lift: 0, tilt: 0, tuck: false, look: [1, 0] },
  thinking: { left: [26, 128], right: [80, 112], rightElbow: [112, 124], lift: 0, tilt: 0, tuck: false, look: [2, -3] },
  jumping: { left: [14, 66], right: [126, 66], leftElbow: [18, 92], rightElbow: [122, 92], lift: -14, tilt: 0, tuck: true, look: [0, -1] },
  leaning: { left: [40, 126], leftElbow: [20, 112], right: [124, 112], rightElbow: [118, 122], lift: 0, tilt: -7, tuck: false, look: [-2, 0] },
};

const arm = (from: Pt, to: Pt, elbow?: Pt): string =>
  elbow ? `M${from[0]} ${from[1]} Q${elbow[0]} ${elbow[1]} ${to[0]} ${to[1]}` : `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`;

function Limb({ d, fill }: { d: string; fill: string }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={13} strokeLinecap="round" fill="none" />
      <path d={d} stroke={fill} strokeWidth={7} strokeLinecap="round" fill="none" />
    </>
  );
}

function Eyes({ mood, look, fill, uid }: { mood: Mood; look: Pt; fill: string; uid: string }) {
  const eyes: Pt[] = [[57, 80], [83, 80]];
  const lid = mood === 'calm' ? 0.42 : mood === 'cool' ? 0.5 : 0;
  const pupil = mood === 'excited' ? 6 : 5;
  return (
    <g>
      {eyes.map(([x, y], i) => (
        <g key={i}>
          <clipPath id={`${uid}-eye${i}`}><ellipse cx={x} cy={y} rx={10.5} ry={12.5} /></clipPath>
          <ellipse cx={x} cy={y} rx={10.5} ry={12.5} fill={WHITE} />
          <g clipPath={`url(#${uid}-eye${i})`}>
            <circle cx={x + look[0]} cy={y + look[1] + (lid ? 3 : 0)} r={pupil} fill={INK} />
            <circle cx={x + look[0] + 2} cy={y + look[1] - 2 + (lid ? 3 : 0)} r={1.7} fill={WHITE} />
            {lid > 0 && <rect x={x - 12} y={y - 14} width={24} height={26 * lid} fill={fill} />}
            {lid > 0 && <line x1={x - 12} x2={x + 12} y1={y - 14 + 26 * lid} y2={y - 14 + 26 * lid - (mood === 'cool' ? (i ? 1.5 : -1.5) : 0)} stroke={INK} strokeWidth={3} />}
          </g>
          <ellipse cx={x} cy={y} rx={10.5} ry={12.5} fill="none" stroke={INK} strokeWidth={3} />
        </g>
      ))}
      {mood === 'excited' && (
        <>
          <path d="M49 62 Q56 57 63 61" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M77 61 Q84 57 91 62" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'cool' && <path d="M76 63 Q84 60 92 64" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'calm':
      return <path d="M63 101 Q70 106 77 101" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'cool':
      return <path d="M64 103 Q73 105 79 99" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'excited':
      return (
        <g>
          <ellipse cx={70} cy={104} rx={7} ry={8} fill={INK} />
          <ellipse cx={70} cy={108} rx={4.5} ry={3} fill="#E8458B" />
        </g>
      );
    case 'happy':
    default:
      return (
        <g>
          <path d="M59 98 Q70 100 81 98 Q80 112 70 112 Q60 112 59 98 Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M64 108 Q70 104 76 108 Q73 111 70 111 Q67 111 64 108 Z" fill="#E8458B" />
        </g>
      );
  }
}

function AccessoryBack({ accessory }: { accessory: Accessory }) {
  if (accessory !== 'backpack') return null;
  return (
    <g>
      <rect x={84} y={74} width={40} height={62} rx={12} fill="#2F8F6B" stroke={INK} strokeWidth={3} />
      <rect x={104} y={96} width={18} height={22} rx={5} fill="#7CC57A" stroke={INK} strokeWidth={3} />
      <rect x={82} y={64} width={44} height={14} rx={7} fill="#C48A4A" stroke={INK} strokeWidth={3} />
    </g>
  );
}

function AccessoryFront({ accessory, rig }: { accessory: Accessory; rig: Rig }) {
  switch (accessory) {
    case 'backpack':
      return (
        <g>
          {['M35 100 Q40 122 48 146', 'M105 100 Q100 122 92 146', 'M40 126 H100'].map((d) => (
            <g key={d}>
              <path d={d} stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
              <path d={d} stroke="#9D6B34" strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          ))}
          <rect x={63} y={120} width={14} height={12} rx={3} fill="#FFC72C" stroke={INK} strokeWidth={2.5} />
        </g>
      );
    case 'chef hat':
      return (
        <g>
          <path d="M48 44 C36 40 36 20 50 20 C50 6 70 2 74 14 C82 4 100 10 96 24 C108 26 104 44 92 44 Z" fill={WHITE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <rect x={48} y={40} width={44} height={14} rx={4} fill={WHITE} stroke={INK} strokeWidth={3} />
          <line x1={62} y1={30} x2={62} y2={40} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={78} y1={28} x2={78} y2={40} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M32 82 C30 36 110 36 108 82" stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
          <path d="M32 82 C30 36 110 36 108 82" stroke="#E8458B" strokeWidth={4} fill="none" strokeLinecap="round" />
          <rect x={22} y={70} width={18} height={28} rx={8} fill="#FFC72C" stroke={INK} strokeWidth={3} />
          <rect x={100} y={70} width={18} height={28} rx={8} fill="#FFC72C" stroke={INK} strokeWidth={3} />
        </g>
      );
    case 'thermos': {
      const [hx, hy] = rig.left;
      return (
        <g>
          <path d={`M${hx - 4} ${hy - 40} q4 -6 0 -12 M${hx + 4} ${hy - 40} q4 -6 0 -12`} stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.7} />
          <rect x={hx - 9} y={hy - 34} width={18} height={40} rx={5} fill="#2F8F6B" stroke={INK} strokeWidth={3} />
          <rect x={hx - 10} y={hy - 38} width={20} height={9} rx={3} fill="#E8458B" stroke={INK} strokeWidth={3} />
          <line x1={hx - 9} x2={hx + 9} y1={hy - 14} y2={hy - 14} stroke={WHITE} strokeWidth={4} />
        </g>
      );
    }
    default:
      return null;
  }
}

export function CharacterArt({ color, accessory, mood, pose, uid }: ArtProps) {
  const fill = BODY_COLORS[color];
  const rig = RIGS[pose];
  const legY = rig.tuck ? 150 : 152;
  const legLen = rig.tuck ? 8 : 14;
  const shoeY = legY + legLen + 4;
  const body = 'M70 40 C97 40 108 60 108 92 L108 128 C108 148 92 158 70 158 C48 158 32 148 32 128 L32 88 C32 58 45 40 70 40 Z';
  return (
    <g>
      {pose === 'jumping' && <ellipse cx={70} cy={184} rx={30} ry={4} fill={INK} opacity={0.15} />}
      <g transform={`translate(0 ${rig.lift}) rotate(${rig.tilt} 70 180)`}>
        <AccessoryBack accessory={accessory} />
        {[54, 86].map((x) => (
          <g key={x}>
            <rect x={x - 6} y={legY - 4} width={12} height={legLen + 6} rx={5} fill={fill} stroke={INK} strokeWidth={3} />
            <path d={`M${x - 13 + (x > 70 ? 4 : -4)} ${shoeY + 6} Q${x - 14 + (x > 70 ? 4 : -4)} ${shoeY - 6} ${x + (x > 70 ? 4 : -4)} ${shoeY - 6} Q${x + 14 + (x > 70 ? 4 : -4)} ${shoeY - 6} ${x + 14 + (x > 70 ? 4 : -4)} ${shoeY + 6} Z`} fill={WHITE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          </g>
        ))}
        <Limb d={arm(SHOULDER_L, rig.left, rig.leftElbow)} fill={fill} />
        {pose !== 'thinking' && <Limb d={arm(SHOULDER_R, rig.right, rig.rightElbow)} fill={fill} />}
        <path d={body} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M44 70 C46 58 54 51 62 49" stroke={WHITE} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.55} />
        {(mood === 'happy' || mood === 'excited') && (
          <>
            <ellipse cx={46} cy={98} rx={6} ry={4} fill={BLUSH} />
            <ellipse cx={94} cy={98} rx={6} ry={4} fill={BLUSH} />
          </>
        )}
        <Eyes mood={mood} look={rig.look} fill={fill} uid={uid} />
        <Mouth mood={mood} />
        <AccessoryFront accessory={accessory} rig={rig} />
        {pose === 'thinking' && <Limb d={arm(SHOULDER_R, rig.right, rig.rightElbow)} fill={fill} />}
        <circle cx={rig.left[0]} cy={rig.left[1]} r={7.5} fill={fill} stroke={INK} strokeWidth={3} />
        <circle cx={rig.right[0]} cy={rig.right[1]} r={7.5} fill={fill} stroke={INK} strokeWidth={3} />
        {pose === 'waving' && (
          <g stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round">
            <path d="M134 50 Q140 58 136 68" />
            <path d="M116 44 Q110 50 112 58" />
          </g>
        )}
        {pose === 'thinking' && (
          <g fill={WHITE} stroke={INK} strokeWidth={2.5}>
            <circle cx={116} cy={48} r={4} />
            <circle cx={126} cy={34} r={6} />
          </g>
        )}
      </g>
    </g>
  );
}

let uidCounter = 0;
const nextUid = (): string => `ch${(uidCounter += 1)}`;

export function Character({ color, accessory = 'none', mood = 'happy', pose = 'standing', size = 160, label, className }: CharacterProps) {
  const uid = nextUid();
  return (
    <svg
      className={className}
      viewBox="0 0 140 190"
      width={size * (140 / 190)}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      overflow="visible"
    >
      <CharacterArt color={color} accessory={accessory} mood={mood} pose={pose} uid={uid} />
    </svg>
  );
}

export function CompassArt({ mood = 'happy' }: { mood?: 'happy' | 'thinking' }) {
  return (
    <g>
      <ellipse cx={50} cy={96} rx={22} ry={3.5} fill={INK} opacity={0.15} />
      <rect x={34} y={78} width={10} height={14} rx={4} fill="#C48A4A" stroke={INK} strokeWidth={3} />
      <rect x={56} y={78} width={10} height={14} rx={4} fill="#C48A4A" stroke={INK} strokeWidth={3} />
      <ellipse cx={37} cy={94} rx={10} ry={5} fill={WHITE} stroke={INK} strokeWidth={3} />
      <ellipse cx={63} cy={94} rx={10} ry={5} fill={WHITE} stroke={INK} strokeWidth={3} />
      <circle cx={50} cy={8} r={6} fill="none" stroke={INK} strokeWidth={3} />
      <circle cx={50} cy={50} r={38} fill="#FFC72C" stroke={INK} strokeWidth={3} />
      <circle cx={50} cy={50} r={29} fill="#F7FBFF" stroke={INK} strokeWidth={3} />
      <path d="M50 24 L55 34 L45 34 Z" fill="#E8458B" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={50} y={20} fontSize={9} fontWeight={800} textAnchor="middle" fill={INK} fontFamily="Figtree Variable, sans-serif">N</text>
      <ellipse cx={41} cy={50} rx={5} ry={6} fill={WHITE} stroke={INK} strokeWidth={2.5} />
      <ellipse cx={59} cy={50} rx={5} ry={6} fill={WHITE} stroke={INK} strokeWidth={2.5} />
      <circle cx={mood === 'thinking' ? 43 : 42} cy={mood === 'thinking' ? 48 : 51} r={2.5} fill={INK} />
      <circle cx={mood === 'thinking' ? 61 : 60} cy={mood === 'thinking' ? 48 : 51} r={2.5} fill={INK} />
      {mood === 'happy'
        ? <path d="M43 61 Q50 67 57 61" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        : <path d="M44 63 L56 62" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />}
      <circle cx={30} cy={58} r={3.5} fill={BLUSH} />
      <circle cx={70} cy={58} r={3.5} fill={BLUSH} />
    </g>
  );
}

export function Compass({ size = 72, mood = 'happy', label }: { size?: number; mood?: 'happy' | 'thinking'; label?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} overflow="visible">
      <CompassArt mood={mood} />
    </svg>
  );
}

// Head-only crop used for avatars and member faces.
export function Face({ color, mood = 'happy', accessory = 'none', size = 40, label }: { color: BodyColor; mood?: Mood; accessory?: Accessory; size?: number; label?: string }) {
  const uid = nextUid();
  const showAcc = accessory === 'chef hat' || accessory === 'headphones';
  return (
    <svg
      viewBox={showAcc ? '22 4 96 96' : '22 40 96 82'}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="face"
    >
      <circle cx={70} cy={showAcc ? 60 : 84} r={showAcc ? 46 : 40} fill="#CDEAF8" />
      <path d="M70 40 C97 40 108 60 108 92 L108 140 L32 140 L32 88 C32 58 45 40 70 40 Z" fill={BODY_COLORS[color]} stroke={INK} strokeWidth={3} />
      <Eyes mood={mood} look={[0, 1]} fill={BODY_COLORS[color]} uid={uid} />
      <Mouth mood={mood} />
      {showAcc && <AccessoryFront accessory={accessory} rig={RIGS.standing} />}
    </svg>
  );
}
