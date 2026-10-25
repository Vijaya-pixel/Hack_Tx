import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Character, Compass, Face } from './Character';
import type { Friend } from '../data';
import { oddsLabel } from '../data';

type IconName = 'check' | 'lock' | 'copy' | 'arrow-left' | 'arrow-right' | 'external' | 'clock' | 'wallet' | 'plus' | 'minus' | 'alert' | 'send' | 'flag' | 'calendar' | 'users' | 'pin' | 'sparkle' | 'refresh';

const PATHS: Record<IconName, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" /></>,
  'arrow-left': <path d="M19 12H5m6-6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14m-6-6l6 6-6 6" />,
  external: <><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5L11 13" /><path d="M17 14v4.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 014 18.5v-10A1.5 1.5 0 015.5 7H10" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  wallet: <><rect x="3.5" y="6.5" width="17" height="12" rx="2.5" /><path d="M16 12.5h1.5" /><path d="M6 6.5l9-3 1 3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" /></>,
  send: <><path d="M4 12l16-8-6 16-2.5-6.5z" /><path d="M11.5 13.5L20 4" /></>,
  flag: <><path d="M6 21V4" /><path d="M6 4.5h11l-2.5 4 2.5 4H6" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  users: <><circle cx="9" cy="9" r="3.5" /><path d="M3 19.5c.8-3.2 3.1-5 6-5s5.2 1.8 6 5" /><circle cx="17" cy="8" r="2.5" /><path d="M16.5 13.5c2.3 0 4 1.4 4.5 4" /></>,
  pin: <><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  sparkle: <path d="M12 3.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z" />,
  refresh: <><path d="M19.5 8A8 8 0 005 9.5" /><path d="M19.5 3.5V8H15" /><path d="M4.5 16A8 8 0 0019 14.5" /><path d="M4.5 20.5V16H9" /></>,
};

export function Icon({ name, size = 20, label, strokeWidth = 2.5 }: { name: IconName; size?: number; label?: string; strokeWidth?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {PATHS[name]}
    </svg>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'quiet' | 'demo' | 'pine';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  pressed?: boolean;
}

export function Button({ variant = 'primary', size = 'md', block, icon, iconRight, pressed, className = '', children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''}${pressed ? ' is-pressed' : ''} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 18 : 20} />}
    </button>
  );
}

export function Panel({ children, className = '', tone = 'snow', as: Tag = 'section', crease = false, ...rest }: { children: ReactNode; className?: string; tone?: 'snow' | 'pale'; as?: 'section' | 'div' | 'article' | 'aside'; crease?: boolean } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`panel panel--${tone}${crease ? ' panel--crease' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function Meter({ value, size = 220, label, showLabel = true, thickness }: { value: number; size?: number; label?: string; showLabel?: boolean; thickness?: number }) {
  const t = thickness ?? Math.max(8, Math.round(size / 11));
  const r = (size - t) / 2 - 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 60 ? 'var(--pine)' : value >= 45 ? 'var(--sun)' : 'var(--berry)';
  const big = size >= 140;
  const text = label ?? oddsLabel(value);
  return (
    <div className={`meter${big ? ' meter--big' : ''}`} style={{ width: size, height: size, ['--m' as string]: `${size}px` }} role="img" aria-label={`${value}% likely. ${text}.`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--snow)" stroke="var(--pale-sky)" strokeWidth={t} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={t}
          strokeDasharray={`${(c * value) / 100} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="meter__center">
        <span className="meter__num">{value}<small>%</small></span>
        {big && showLabel && <span className="meter__label">{text}</span>}
      </div>
    </div>
  );
}

export interface SignSpec { id: string; title: string; detail: string; locked?: boolean; done?: boolean; current?: boolean }

export function Sign({ sign, dir, onClick }: { sign: SignSpec; dir: 'left' | 'right'; onClick?: () => void }) {
  const status = sign.locked ? 'Locked' : sign.done ? 'Done' : sign.current ? 'Next step' : 'Open';
  return (
    <button
      type="button"
      className={`sign sign--${dir}${sign.locked ? ' is-locked' : ''}${sign.current ? ' is-current' : ''}`}
      aria-disabled={sign.locked || undefined}
      onClick={sign.locked ? undefined : onClick}
      aria-label={`${sign.title}. ${status}. ${sign.detail}`}
    >
      <svg className="sign__shape" viewBox="0 0 320 76" preserveAspectRatio="none" aria-hidden="true">
        <path
          d={dir === 'right' ? 'M10 4 H282 L316 38 L282 72 H10 Q4 72 4 66 V10 Q4 4 10 4 Z' : 'M310 4 H38 L4 38 L38 72 H310 Q316 72 316 66 V10 Q316 4 310 4 Z'}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="sign__nail" aria-hidden="true" />
      <span className="sign__body">
        <span className="sign__title">
          {sign.locked && <Icon name="lock" size={18} />}
          {sign.done && <span className="sign__done"><Icon name="check" size={14} strokeWidth={3.5} /></span>}
          {sign.title}
        </span>
        <span className="sign__detail">{sign.detail}</span>
      </span>
    </button>
  );
}

export function Signpost({ signs, onPick, compact }: { signs: SignSpec[]; onPick?: (id: string) => void; compact?: boolean }) {
  return (
    <nav className={`signpost${compact ? ' signpost--compact' : ''}`} aria-label="Expeditions">
      <div className="signpost__post" aria-hidden="true">
        <span className="signpost__cap" />
      </div>
      <ul className="signpost__signs">
        {signs.map((s, i) => (
          <li key={s.id}>
            <Sign sign={s} dir={i % 2 === 0 ? 'right' : 'left'} onClick={() => onPick?.(s.id)} />
          </li>
        ))}
      </ul>
      <div className="signpost__ground" aria-hidden="true" />
    </nav>
  );
}

export function Chip({ selected, children, sub, onClick, disabled }: { selected?: boolean; children: ReactNode; sub?: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={`chip${selected ? ' is-on' : ''}`} aria-pressed={selected} onClick={onClick} disabled={disabled}>
      <span className="chip__check" aria-hidden="true">{selected ? <Icon name="check" size={16} strokeWidth={3.5} /> : null}</span>
      <span className="chip__main">{children}</span>
      {sub && <span className="chip__sub">{sub}</span>}
    </button>
  );
}

export function Pill({ selected, children, onClick }: { selected?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={`pill${selected ? ' is-on' : ''}`} aria-pressed={selected} onClick={onClick}>
      {selected && <Icon name="check" size={16} strokeWidth={3.5} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>{label}</label>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
    </div>
  );
}

export function Slider({ value, min, max, onChange, label, format }: { value: number; min: number; max: number; onChange?: (v: number) => void; label: string; format: (v: number) => string }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="slider__value">{format(value)}</output>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      <div className="slider__ticks" aria-hidden="true"><span>{format(min)}</span><span>{format(max)}</span></div>
    </div>
  );
}

export function Stepper({ value, min, max, onChange, unit }: { value: number; min: number; max: number; onChange?: (v: number) => void; unit: (v: number) => string }) {
  return (
    <div className="stepper" role="group" aria-label="Nights">
      <button type="button" className="stepper__btn" aria-label="One fewer night" disabled={value <= min} onClick={() => onChange?.(value - 1)}><Icon name="minus" /></button>
      <span className="stepper__value" aria-live="polite"><b>{value}</b> {unit(value)}</span>
      <button type="button" className="stepper__btn" aria-label="One more night" disabled={value >= max} onClick={() => onChange?.(value + 1)}><Icon name="plus" /></button>
    </div>
  );
}

export function NameTag({ friend: f, you, compact }: { friend: Friend; you?: boolean; compact?: boolean }) {
  return (
    <span className="nametag">
      <b>{f.name}{compact && you ? ' (you)' : ''}</b>
      {!compact && <span>{f.city}{you ? ' (you)' : ''}</span>}
    </span>
  );
}

export function FaceStamp({ friend: f, signed, size = 64 }: { friend: Friend; signed: boolean; size?: number }) {
  return (
    <div className={`facestamp${signed ? ' is-signed' : ''}`}>
      <span className="facestamp__face">
        <Face color={f.character.color} mood={f.character.mood} accessory={f.character.accessory} size={size} />
        {signed && <span className="facestamp__check"><Icon name="check" size={size * 0.34} strokeWidth={4} /></span>}
      </span>
      <span className="facestamp__name">{f.name}</span>
      <span className="facestamp__state">{signed ? 'Signed' : 'Not yet'}</span>
    </div>
  );
}

export function Loading({ text = 'Scouting the route…' }: { text?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <div className="state__bounce"><Character color="orange" accessory="backpack" mood="excited" pose="jumping" size={96} /></div>
      <p className="state__title">{text}</p>
      <p className="state__body">Checking travel times for all four cities. This takes a few seconds.</p>
    </div>
  );
}

export function Empty({ title, body, action, onAction }: { title: string; body: string; action: string; onAction?: () => void }) {
  return (
    <div className="state state--empty">
      <Compass size={84} mood="thinking" />
      <p className="state__title">{title}</p>
      <p className="state__body">{body}</p>
      <Button variant="primary" icon="users" onClick={onAction}>{action}</Button>
    </div>
  );
}

export function ErrorState({ title, body, action = 'Try again', onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon"><Icon name="alert" size={28} /></span>
      <div>
        <p className="state__title">{title}</p>
        <p className="state__body">{body}</p>
      </div>
      <Button variant="secondary" size="sm" icon="refresh" onClick={onAction}>{action}</Button>
    </div>
  );
}

export function Stamp({ number, city, date, size = 280 }: { number: number; city: string; date: string; size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="stamp" viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={`Reunion number ${number} stamp. ${city}, ${date}.`}>
      <defs>
        <path id={`${id}-top`} d="M56 150 A94 94 0 0 1 244 150" />
        <path id={`${id}-bot`} d="M46 150 A104 104 0 0 0 254 150" />
      </defs>
      <g transform="rotate(-8 150 150)">
        <circle cx={150} cy={150} r={138} fill="#F7FBFF" stroke="#17324D" strokeWidth={3} />
        <circle cx={150} cy={150} r={126} fill="none" stroke="#2F8F6B" strokeWidth={8} />
        <circle cx={150} cy={150} r={112} fill="none" stroke="#2F8F6B" strokeWidth={2} strokeDasharray="4 6" />
        <text fontFamily="Bagel Fat One, sans-serif" fontSize={22} fill="#2F8F6B" letterSpacing={1}>
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">Four Corners</textPath>
        </text>
        <text fontFamily="Figtree Variable, sans-serif" fontWeight={800} fontSize={15} fill="#17324D" letterSpacing={1}>
          <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">{`${city} · ${date}`}</textPath>
        </text>
        <path d="M100 168 L132 120 L150 142 L168 110 L200 168 Z" fill="#2F8F6B" />
        <path d="M132 120 L140 133 L132 137 L124 131 Z M168 110 L177 125 L168 129 L160 123 Z" fill="#F7FBFF" />
        <path d="M168 110 V86" stroke="#17324D" strokeWidth={3} />
        <path d="M168 86 H188 L182 93 L188 100 H168" fill="#E8458B" stroke="#17324D" strokeWidth={3} strokeLinejoin="round" />
        <text x={150} y={204} textAnchor="middle" fontFamily="Bagel Fat One, sans-serif" fontSize={28} fill="#17324D">{`Reunion #${number}`}</text>
      </g>
    </svg>
  );
}

export function SpeechBubble({ children }: { children: ReactNode }) {
  return <div className="bubble">{children}</div>;
}
