import { createContext, useContext, useState, type ReactNode } from 'react';
import { Face } from './components/Character';
import { Button, Icon } from './components/ui';
import { GROUP, ME } from './data';

export type Device = 'desktop' | 'mobile';
export type ScreenId = 'welcome' | 'about' | 'reveal' | 'basecamp' | 'scout' | 'odds' | 'flag' | 'health' | 'stamp' | 'states';

interface Ctx { device: Device; go: (s: ScreenId) => void }
const DeviceCtx = createContext<Ctx>({ device: 'desktop', go: () => {} });

export function DeviceProvider({ device, go, children }: { device: Device; go: (s: ScreenId) => void; children: ReactNode }) {
  return <DeviceCtx.Provider value={{ device, go }}>{children}</DeviceCtx.Provider>;
}
export const useDevice = (): Ctx => useContext(DeviceCtx);

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={`logo${small ? ' logo--sm' : ''}`}>
      <svg viewBox="0 0 40 40" width={small ? 30 : 36} height={small ? 30 : 36} aria-hidden="true">
        <path d="M4 34 L14 16 L20 24 L27 10 L37 34 Z" fill="#2F8F6B" stroke="#17324D" strokeWidth={3} strokeLinejoin="round" />
        <path d="M27 10 V3" stroke="#17324D" strokeWidth={3} strokeLinecap="round" />
        <path d="M27 3 H35 L32 6 L35 9 H27" fill="#E8458B" stroke="#17324D" strokeWidth={2.5} strokeLinejoin="round" />
      </svg>
      <span>Four Corners</span>
    </span>
  );
}

export function InviteCode({ compact }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="invite">
      <span className="invite__text">{compact ? 'Code' : 'Invite code:'} <b>{GROUP.code}</b></span>
      <button
        type="button"
        className="invite__copy"
        onClick={() => { void navigator.clipboard?.writeText(GROUP.code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
        aria-label={copied ? 'Invite code copied' : `Copy invite code ${GROUP.code}`}
      >
        <Icon name={copied ? 'check' : 'copy'} size={18} />
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}

export function TopBar() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="topbar__home" onClick={() => go('basecamp')} aria-label="Go to Base Camp">
          <Logo small={mobile} />
        </button>
        {!mobile && <span className="topbar__divider" aria-hidden="true" />}
        {!mobile && (
          <div className="topbar__group">
            <span className="topbar__eyebrow">Base Camp</span>
            <span className="topbar__name">{GROUP.name}</span>
          </div>
        )}
      </div>
      <div className="topbar__right">
        <InviteCode compact={mobile} />
        {!mobile && (
          <span className="topbar__me">
            <Face color={ME.character.color} mood={ME.character.mood} size={40} />
            <span>{ME.name}</span>
          </span>
        )}
      </div>
    </header>
  );
}

export function ExpeditionHeader({ step, title, intro, aside }: { step: string; title: string; intro: string; aside?: ReactNode }) {
  const { go } = useDevice();
  return (
    <div className="exp-head">
      <div className="exp-head__main">
        <Button variant="quiet" size="sm" icon="arrow-left" onClick={() => go('basecamp')}>Back to Base Camp</Button>
        <p className="exp-head__step">{step}</p>
        <h1 className="h1">{title}</h1>
        <p className="lede">{intro}</p>
      </div>
      {aside && <div className="exp-head__aside">{aside}</div>}
    </div>
  );
}

export function AppFrame({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const { device } = useDevice();
  return (
    <div className={`fc fc--${device}`}>
      {!bare && <TopBar />}
      <main className="fc__main">{children}</main>
    </div>
  );
}
