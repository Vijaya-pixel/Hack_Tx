import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bagel-fat-one/latin-400.css';
import '@fontsource-variable/figtree/wght.css';
import './styles.css';
import { DeviceProvider, Logo, type Device, type ScreenId } from './shell';
import { AboutYou, Reveal, Welcome } from './screens/Onboarding';
import { BaseCamp, BaseCampEmpty } from './screens/BaseCamp';
import { Odds, PlantFlag, Scout, SummitStamp, TripHealth } from './screens/Expeditions';
import { States } from './screens/States';
import { DesignSystem } from './screens/DesignSystem';
import { Character } from './components/Character';
import { CAST } from './data';

interface Entry { key: string; screen: ScreenId; n: string; title: string; render: () => ReactNode }

const ENTRIES: Entry[] = [
  { key: 'welcome', screen: 'welcome', n: '1', title: 'Welcome', render: () => <Welcome /> },
  { key: 'about', screen: 'about', n: '2', title: 'About you', render: () => <AboutYou /> },
  { key: 'reveal', screen: 'reveal', n: '3', title: 'Character reveal', render: () => <Reveal /> },
  { key: 'basecamp', screen: 'basecamp', n: '4', title: 'Base Camp', render: () => <BaseCamp /> },
  { key: 'scout', screen: 'scout', n: '5', title: 'Scout the Route', render: () => <Scout /> },
  { key: 'odds', screen: 'odds', n: '6', title: 'Summit Odds', render: () => <Odds /> },
  { key: 'flag', screen: 'flag', n: '7a', title: 'Plant the Flag: ready to sign', render: () => <PlantFlag /> },
  { key: 'flag-signed', screen: 'flag', n: '7b', title: 'Plant the Flag: all 4 signed', render: () => <PlantFlag initial="signed" /> },
  { key: 'flag-tampered', screen: 'flag', n: '7c', title: 'Plant the Flag: data tampered (demo)', render: () => <PlantFlag initial="tampered" /> },
  { key: 'health', screen: 'health', n: '8', title: 'Trip health', render: () => <TripHealth /> },
  { key: 'stamp', screen: 'stamp', n: '9a', title: 'Summit Stamp: after the trip', render: () => <SummitStamp /> },
  { key: 'stamp-after', screen: 'stamp', n: '9b', title: 'Summit Stamp: stamped', render: () => <SummitStamp initial="after" /> },
  { key: 'basecamp-empty', screen: 'basecamp', n: 'S1', title: 'Base Camp: empty (just you)', render: () => <BaseCampEmpty /> },
  { key: 'states', screen: 'states', n: 'S2', title: 'Loading, empty and error states', render: () => <States /> },
];

const byKey = (k: string): Entry => ENTRIES.find((e) => e.key === k) ?? ENTRIES[0];

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash.replace(/^#\/?/, ''));
  useEffect(() => {
    const on = () => { setHash(window.location.hash.replace(/^#\/?/, '')); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

const nav = (path: string) => { window.location.hash = `/${path}`; };

function BoardBar({ current }: { current: string }) {
  const links = [['', 'Overview'], ['system', 'Design system'], ['desktop', 'Desktop screens'], ['mobile', 'Mobile screens'], ['app/welcome', 'Prototype']];
  return (
    <nav className="boardbar" aria-label="Design file">
      <a href="#/" className="boardbar__logo"><Logo small /></a>
      <ul>
        {links.map(([href, label]) => (
          <li key={href}><a href={`#/${href}`} aria-current={current === href ? 'page' : undefined}>{label}</a></li>
        ))}
      </ul>
    </nav>
  );
}

function Frame({ entry, device }: { entry: Entry; device: Device }) {
  return (
    <figure className={`frame frame--${device}`} id={`${device}-${entry.key}`}>
      <figcaption className="frame__cap">
        <span className="frame__n">{entry.n}</span>
        <span>{entry.title}</span>
        <span className="frame__size">{device === 'desktop' ? '1440' : '390'} wide</span>
        <a href={`#/screen/${entry.key}/${device}`}>Open alone</a>
      </figcaption>
      <div className="frame__screen" style={{ width: device === 'desktop' ? 1440 : 390 }}>
        <DeviceProvider device={device} go={(s) => nav(`screen/${s}/${device}`)}>{entry.render()}</DeviceProvider>
      </div>
    </figure>
  );
}

function Board({ device }: { device: Device }) {
  return (
    <div className={`board board--${device}`}>
      <header className="board__head">
        <h1 className="display">{device === 'desktop' ? 'Desktop screens · 1440' : 'Mobile screens · 390'}</h1>
        <p className="lede">Every screen and key state. Click any button to follow the flow, or open a screen on its own.</p>
      </header>
      <div className="board__frames">
        {ENTRIES.map((e) => <Frame key={e.key} entry={e} device={device} />)}
      </div>
    </div>
  );
}

function Overview() {
  const cards = [
    { href: 'system', title: 'Design system', body: 'Colors, type, buttons, signs, panels, meter and the character component.' },
    { href: 'desktop', title: 'Desktop screens', body: 'All nine screens plus states at 1440 wide.' },
    { href: 'mobile', title: 'Mobile screens', body: 'The same screens at 390 wide with 44px tap targets.' },
    { href: 'app/welcome', title: 'Clickable prototype', body: 'Walk the flow from Welcome to the Summit Stamp. Resizes to fit your window.' },
  ];
  return (
    <div className="overview">
      <div className="overview__cast" aria-hidden="true">
        {CAST.map((f) => <Character key={f.id} {...f.character} size={150} />)}
      </div>
      <h1 className="display">Four Corners</h1>
      <p className="lede">Four friends. Four cities. One weekend that actually happens. This is the design file: system first, then every screen on desktop and mobile.</p>
      <ul className="overview__links">
        {cards.map((c) => (
          <li key={c.href}><a href={`#/${c.href}`}><b>{c.title}</b><span>{c.body}</span></a></li>
        ))}
      </ul>
    </div>
  );
}

function Single({ entryKey, device }: { entryKey: string; device: Device }) {
  const e = byKey(entryKey);
  return (
    <div className={`single single--${device}`}>
      <div className="single__screen">
        <DeviceProvider device={device} go={(s) => nav(`screen/${s}/${device}`)}>{e.render()}</DeviceProvider>
      </div>
    </div>
  );
}

function Prototype({ entryKey }: { entryKey: string }) {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const device: Device = w < 760 ? 'mobile' : 'desktop';
  return (
    <DeviceProvider device={device} go={(s) => nav(`app/${s}`)}>{byKey(entryKey).render()}</DeviceProvider>
  );
}

function App() {
  const hash = useHash();
  const [root, a, b] = hash.split('/');
  const chrome = root !== 'screen' && root !== 'app';
  return (
    <>
      {chrome && <BoardBar current={hash} />}
      {root === 'system' && <DesignSystem />}
      {root === 'desktop' && <Board device="desktop" />}
      {root === 'mobile' && <Board device="mobile" />}
      {root === 'screen' && <Single entryKey={a} device={b === 'mobile' ? 'mobile' : 'desktop'} />}
      {root === 'app' && <Prototype entryKey={a || 'welcome'} />}
      {!['system', 'desktop', 'mobile', 'screen', 'app'].includes(root) && <Overview />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
