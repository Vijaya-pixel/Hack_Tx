import { useState } from 'react';
import { Button, Empty, Icon, Meter, Panel, Signpost, type SignSpec } from '../components/ui';
import { Face, Compass } from '../components/Character';
import { BaseCampScene } from '../components/Scenes';
import { AppFrame, useDevice, type ScreenId } from '../shell';
import { CAST, FEED, ME, NUDGES, PACT_PLAN, friend } from '../data';

export const SIGNS: SignSpec[] = [
  { id: 'scout', title: 'Scout the Route', detail: 'Done. 4 plans found', done: true },
  { id: 'odds', title: 'Summit Odds', detail: 'Done. 61% for Kansas City', done: true },
  { id: 'flag', title: 'Plant the Flag', detail: 'Next: everyone signs the promise', current: true },
  { id: 'countdown', title: 'Countdown', detail: 'Opens once all 4 have signed', locked: true },
  { id: 'stamp', title: 'Summit Stamp', detail: 'Opens after the trip', locked: true },
];

const SIGN_TO_SCREEN: Record<string, ScreenId> = { scout: 'scout', odds: 'odds', flag: 'flag', stamp: 'stamp' };

export function CampJournal({ mobile }: { mobile: boolean }) {
  const [draft, setDraft] = useState('');
  const [feed, setFeed] = useState(FEED);
  const send = () => {
    if (!draft.trim()) return;
    setFeed([...feed, { at: 'Just now', from: ME.id, text: draft.trim() }]);
    setDraft('');
  };
  return (
    <Panel className="journal" aria-labelledby="journal-title">
      <div className="journal__head">
        <h2 id="journal-title" className="h2">Camp journal</h2>
        <span className="muted">{feed.length} messages today</span>
      </div>
      <div className={`journal__grid${mobile ? ' is-stacked' : ''}`}>
        <div className="journal__notes" aria-label="Nudges from your guide">
          <p className="journal__label"><Compass size={28} /> Trail notes</p>
          {NUDGES.map((n, i) => (
            <div key={n.id} className={`note note--${i % 2 ? 'b' : 'a'}`}>
              <p>{n.text}</p>
              {i === 0 && <Button size="sm" variant="secondary">Remind Dante</Button>}
            </div>
          ))}
        </div>
        <div className="journal__feed">
          <ol className="feed" aria-live="polite">
            {feed.map((m, i) => {
              if (m.system) return <li key={i} className="feed__system"><Icon name="flag" size={16} /> <span>{m.text}</span> <time>{m.at}</time></li>;
              const f = friend(m.from ?? '');
              return (
                <li key={i} className={`feed__msg${f.id === ME.id ? ' is-me' : ''}`}>
                  <Face color={f.character.color} mood={f.character.mood} size={36} />
                  <div>
                    <p className="feed__meta"><b>{f.name}</b> <time>{m.at}</time></p>
                    <p className="feed__text">{m.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label htmlFor="composer" className="sr-only">Message the group</label>
            <input id="composer" className="input" placeholder="Write to the group…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button type="submit" variant="primary" icon="send" size={mobile ? 'md' : 'md'}>Send</Button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

function PlanGlance() {
  const { go } = useDevice();
  return (
    <Panel className="glance" tone="snow">
      <p className="eyebrow">Current plan</p>
      <div className="glance__row">
        <Meter value={PACT_PLAN.survival} size={84} />
        <div>
          <p className="glance__city">{PACT_PLAN.nights} night in {PACT_PLAN.city}</p>
          <p className="muted">Nov 21 to 22 · ${PACT_PLAN.costPp} per person</p>
          <p className="muted">Likely to happen</p>
        </div>
      </div>
      <Button variant="quiet" size="sm" iconRight="arrow-right" onClick={() => go('health')}>See trip health</Button>
    </Panel>
  );
}

export function BaseCamp() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  const pick = (id: string) => { const s = SIGN_TO_SCREEN[id]; if (s) go(s); };
  return (
    <AppFrame>
      <div className="camp">
        <div className="camp__main">
          <div className="camp__hello">
            <div>
              <h1 className="h1">Welcome back to Base Camp, {ME.name}</h1>
              <p className="lede">3 of 4 friends have marked their weekends. Next step: everyone signs the promise for Kansas City.</p>
            </div>
            {!mobile && <Button variant="primary" size="lg" onClick={() => go('flag')} iconRight="arrow-right">Go to Plant the Flag</Button>}
          </div>
          <BaseCampScene mobile={mobile} />
          {mobile && <Button variant="primary" size="lg" block onClick={() => go('flag')} iconRight="arrow-right">Go to Plant the Flag</Button>}
          {!mobile && <CampJournal mobile={false} />}
        </div>
        <aside className="camp__side">
          <h2 className="h2 camp__side-title">Expeditions</h2>
          <Signpost signs={SIGNS} onPick={pick} compact={mobile} />
          <PlanGlance />
        </aside>
        {mobile && <CampJournal mobile />}
      </div>
    </AppFrame>
  );
}

export function BaseCampEmpty() {
  const { device } = useDevice();
  const mobile = device === 'mobile';
  return (
    <AppFrame>
      <div className="camp camp--empty">
        <div className="camp__main">
          <div className="camp__hello">
            <div>
              <h1 className="h1">Base Camp is set up</h1>
              <p className="lede">It's just you so far. Expeditions open once a friend joins.</p>
            </div>
          </div>
          <BaseCampScene mobile={mobile} members={[CAST[1]]} />
          <Panel>
            <Empty title="Invite a friend to start" body="Send them the code K7M2QX. They answer three questions and appear here by the fire." action="Copy invite link" />
          </Panel>
        </div>
      </div>
    </AppFrame>
  );
}
