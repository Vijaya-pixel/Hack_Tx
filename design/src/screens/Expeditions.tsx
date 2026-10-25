import { useEffect, useRef, useState } from 'react';
import { Button, Chip, FaceStamp, Icon, Meter, Panel, Slider, Stamp, Stepper } from '../components/ui';
import { Face } from '../components/Character';
import { GuideTip } from '../components/Scenes';
import { AppFrame, ExpeditionHeader, useDevice } from '../shell';
import { CAST, EXPLORER_URL, HISTORY, MY_WEEKENDS, PACT_PLAN, PLANS, SMALLER, WEEKENDS, oddsLabel } from '../data';

function WhoFree({ ids }: { ids: string[] }) {
  return (
    <span className="whofree" aria-label={`${ids.length} of 4 free`}>
      {CAST.map((f) => (
        <span key={f.id} className={`whofree__dot${ids.includes(f.id) ? ' is-free' : ''}`} title={f.name}>
          {ids.includes(f.id) ? f.name[0] : ''}
        </span>
      ))}
      <span className="whofree__count">{ids.length}/4</span>
    </span>
  );
}

export function Scout() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  const [mine, setMine] = useState<string[]>(MY_WEEKENDS);
  const [hours, setHours] = useState(8);
  const toggle = (iso: string) => setMine(mine.includes(iso) ? mine.filter((x) => x !== iso) : [...mine, iso]);
  return (
    <AppFrame>
      <div className="exp">
        <ExpeditionHeader
          step="Expedition 1 of 5"
          title="Scout the Route"
          intro="Tap every Saturday you could leave town. We'll match everyone's weekends with travel time and cost, and rank the plans."
          aside={!mobile && <GuideTip>Nov 21 and Dec 5 are open for all four of you. Those are your strongest weekends.</GuideTip>}
        />
        <div className="exp__grid exp__grid--scout">
          <div className="stack">
            <Panel aria-labelledby="pick-title">
              <div className="panel__head">
                <h2 id="pick-title" className="h2">Pick the weekends you're free</h2>
                <span className="muted">{mine.length} picked</span>
              </div>
              <p className="muted">Each chip is a Saturday. Dots show who else is free that weekend.</p>
              <div className="chips">
                {WEEKENDS.map((w) => {
                  const others = w.free.filter((id) => id !== 'beck');
                  const ids = mine.includes(w.iso) ? [...others, 'beck'] : others;
                  return (
                    <Chip key={w.iso} selected={mine.includes(w.iso)} onClick={() => toggle(w.iso)} sub={<WhoFree ids={ids} />}>
                      {w.label}
                    </Chip>
                  );
                })}
              </div>
            </Panel>
            <Panel>
              <Slider label="Longest trip I'll take" value={hours} min={2} max={12} onChange={setHours} format={(v) => `${v} hours`} />
              <p className="muted">Door to door, including the airport. Plans longer than this for you are left out.</p>
            </Panel>
          </div>
          <Panel aria-labelledby="plans-title">
            <div className="panel__head">
              <h2 id="plans-title" className="h2">Best plans for all four</h2>
              <span className="muted">Ranked by odds</span>
            </div>
            <ol className="plans">
              {PLANS.map((p, i) => (
                <li key={p.id} className={`plan${i === 0 ? ' is-best' : ''}`}>
                  <span className="plan__rank" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
                  <div className="plan__info">
                    <p className="plan__city">{p.city} {i === 0 && <span className="tag">Best bet</span>}</p>
                    <p className="plan__when"><Icon name="calendar" size={18} /> {p.dates} · {p.nights} nights</p>
                    <div className="plan__facts">
                      <span><Icon name="clock" size={18} /> <span>Longest trip <span className="nowrap">{p.longestTrip}</span> <span className="muted nowrap">({p.longestWho})</span></span></span>
                      <span><Icon name="wallet" size={18} /> ${p.costPp} per person</span>
                    </div>
                  </div>
                  <Meter value={p.survival} size={mobile ? 64 : 76} />
                  <Button variant={i === 0 ? 'primary' : 'secondary'} size="sm" onClick={() => go('odds')} block={mobile}>Check the odds</Button>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AppFrame>
  );
}

const ODDS_BY_NIGHTS: Record<number, number> = { 1: 58, 2: 52, 3: 39 };

export function Odds() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  const [nights, setNights] = useState(2);
  const value = ODDS_BY_NIGHTS[nights];
  return (
    <AppFrame>
      <div className="exp">
        <ExpeditionHeader
          step="Expedition 2 of 5"
          title="Summit Odds"
          intro="How likely this trip is to actually happen, based on travel time, cost, how far ahead you're booking and how many nights you need."
        />
        <div className="exp__grid exp__grid--odds">
          <Panel className="odds" aria-labelledby="odds-title">
            <p className="eyebrow">Denver · Nov 21 · from Scout the Route</p>
            <h2 id="odds-title" className="sr-only">Odds for Denver</h2>
            <div className="odds__meter">
              <Meter value={value} size={mobile ? 220 : 280} />
            </div>
            <div className="odds__controls">
              <span className="odds__label">Nights away</span>
              <Stepper value={nights} min={1} max={3} onChange={setNights} unit={(v) => (v === 1 ? 'night' : 'nights')} />
            </div>
            <ul className="factors" aria-label="What moves the odds">
              <li className="factor factor--up"><span className="factor__tag"><Icon name="plus" size={16} strokeWidth={3} /> Helps</span> All 4 free that weekend</li>
              <li className="factor factor--up"><span className="factor__tag"><Icon name="plus" size={16} strokeWidth={3} /> Helps</span> 28 days to book</li>
              <li className="factor factor--down"><span className="factor__tag"><Icon name="minus" size={16} strokeWidth={3} /> Hurts</span> Dante's trip is 6h 50m</li>
              <li className="factor factor--down"><span className="factor__tag"><Icon name="minus" size={16} strokeWidth={3} /> Hurts</span> ${nights === 1 ? 210 : nights === 2 ? 340 : 470} per person is above your usual</li>
            </ul>
            <Button variant="quiet" size="sm" iconRight="arrow-right" onClick={() => go('health')}>See how the odds changed this week</Button>
          </Panel>
          <Panel aria-labelledby="smaller-title">
            <h2 id="smaller-title" className="h2">Make it smaller</h2>
            <p className="muted">Smaller trips happen more often. These keep everyone in and raise the odds.</p>
            <ul className="smaller">
              {SMALLER.map((s) => (
                <li key={s.id} className="smaller__row">
                  <div>
                    <p className="smaller__title">{s.text}: <b>{s.survival}%</b> <span className="delta">(+{s.delta})</span></p>
                    <p className="muted">{s.dates} · {s.why}</p>
                  </div>
                  <Button variant="pine" size="sm" onClick={() => go('flag')} block={mobile}>Use this plan</Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppFrame>
  );
}

export type FlagState = 'ready' | 'signing' | 'signed' | 'tampered';

export function PlantFlag({ initial = 'ready' }: { initial?: FlagState }) {
  const { device } = useDevice();
  const mobile = device === 'mobile';
  const [state, setState] = useState<FlagState>(initial);
  const [signed, setSigned] = useState(initial === 'ready' ? 0 : 4);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const signTogether = () => {
    setState('signing');
    setSigned(0);
    let n = 0;
    timer.current = window.setInterval(() => {
      n += 1;
      setSigned(n);
      if (n >= 4) { window.clearInterval(timer.current); setState('signed'); }
    }, 650);
  };

  return (
    <AppFrame>
      <div className="exp">
        <ExpeditionHeader
          step="Expedition 3 of 5"
          title="Plant the Flag"
          intro="One promise, four signatures. Once everyone signs, the plan is recorded on Solana so nobody can quietly change it."
        />
        <div className="exp__grid exp__grid--flag">
          <Panel className="promise" crease={!mobile} aria-labelledby="promise-title">
            <p className="eyebrow">The plan</p>
            <h2 id="promise-title" className="h1 promise__city">
              {PACT_PLAN.nights} night in {state === 'tampered' ? <mark className="tampered">Denver</mark> : PACT_PLAN.city}
            </h2>
            {state === 'tampered' && <p className="tag tag--alert">Changed after signing. Signed city was Kansas City</p>}
            <dl className="summary">
              <div><dt><Icon name="calendar" size={18} /> When</dt><dd>{PACT_PLAN.dates}</dd></div>
              <div><dt><Icon name="clock" size={18} /> Longest trip</dt><dd>{PACT_PLAN.longestTrip} ({PACT_PLAN.longestWho}, from Seattle)</dd></div>
              <div><dt><Icon name="wallet" size={18} /> Cost</dt><dd>About ${PACT_PLAN.costPp} per person</dd></div>
              <div><dt><Icon name="sparkle" size={18} /> Odds</dt><dd>{PACT_PLAN.survival}%, {oddsLabel(PACT_PLAN.survival).toLowerCase()}</dd></div>
            </dl>
            <blockquote className="promise__text">
              “We, Arlo, Beck, Cyrus and Dante, promise to meet in Kansas City on Saturday, November 21, 2026. We book travel by October 31. If something comes up, we say so in Base Camp first.”
            </blockquote>
          </Panel>
          <Panel className="signing" aria-labelledby="sign-title">
            <h2 id="sign-title" className="h2">Signatures</h2>
            <p className="muted" aria-live="polite">{signed} of 4 signed</p>
            <div className="signers">
              {CAST.map((f, i) => <FaceStamp key={f.id} friend={f} signed={i < signed} size={mobile ? 56 : 72} />)}
            </div>
            {(state === 'ready' || state === 'signing') && (
              <Button variant="primary" size="lg" block onClick={signTogether} disabled={state === 'signing'} icon="flag">
                {state === 'signing' ? 'Signing…' : 'Sign together'}
              </Button>
            )}
            {state === 'ready' && <p className="muted center">Signs for all four at once. Takes about 5 seconds.</p>}
            {state === 'signed' && (
              <div className="result result--ok" role="status">
                <p className="result__title"><span className="result__icon"><Icon name="check" size={20} strokeWidth={3.5} /></span> All 4 signed</p>
                <p>The promise is recorded. Countdown is now open in Base Camp.</p>
                <a className="link" href={EXPLORER_URL} target="_blank" rel="noreferrer">View on Solana Explorer <Icon name="external" size={16} /></a>
              </div>
            )}
            {state === 'tampered' && (
              <div className="result result--bad" role="alert">
                <p className="result__title"><span className="result__icon"><Icon name="alert" size={20} /></span> Data changed</p>
                <p>This no longer matches the signed record. The city in our database now says Denver, but the signatures are for Kansas City.</p>
                <a className="link" href={EXPLORER_URL} target="_blank" rel="noreferrer">Compare with Solana Explorer <Icon name="external" size={16} /></a>
              </div>
            )}
            {(state === 'signed' || state === 'tampered') && (
              <div className="demo-box">
                <p className="demo-box__label">Demo only</p>
                <p className="muted">Demo: one server holds the four test wallets.</p>
                {state === 'signed'
                  ? <Button variant="demo" size="sm" icon="alert" onClick={() => setState('tampered')}>Tamper with the data</Button>
                  : <Button variant="secondary" size="sm" icon="refresh" onClick={() => setState('signed')}>Undo the tampering</Button>}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppFrame>
  );
}

export function LineChart({ mobile }: { mobile: boolean }) {
  const W = mobile ? 340 : 900;
  const H = mobile ? 240 : 320;
  const pad = { l: mobile ? 36 : 48, r: mobile ? 16 : 28, t: 24, b: 36 };
  const x = (i: number) => pad.l + (i / (HISTORY.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const firstLive = HISTORY.findIndex((p) => !p.demo);
  const demoPts = HISTORY.slice(0, firstLive + 1);
  const livePts = HISTORY.slice(firstLive);
  const path = (pts: typeof HISTORY, off: number) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const last = HISTORY[HISTORY.length - 1];
  const lx = x(HISTORY.length - 1);
  const ly = y(last.v);
  const step = mobile ? 7 : 2;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Trip score over two weeks. Demo history rises from ${HISTORY[0].v}% to ${HISTORY[firstLive].v}%. Live score is ${last.v}% today.`}>
      <rect x={x(firstLive)} y={pad.t} width={W - pad.r - x(firstLive)} height={H - pad.t - pad.b} fill="#CDEAF8" opacity={0.5} rx={8} />
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#CDEAF8" strokeWidth={2} />
          <text x={pad.l - 10} y={y(v) + 5} textAnchor="end" className="chart__axis">{v}%</text>
        </g>
      ))}
      {HISTORY.map((p, i) => (i % step === 0 || i === HISTORY.length - 1) && (
        <text key={p.day} x={x(i)} y={H - 10} textAnchor="middle" className="chart__axis">{p.day}</text>
      ))}
      <path d={path(demoPts, 0)} fill="none" stroke="#6B7A99" strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(livePts, firstLive)} fill="none" stroke="#2F8F6B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      {demoPts.map((p, i) => i < firstLive && <circle key={p.day} cx={x(i)} cy={y(p.v)} r={3.5} fill="#F7FBFF" stroke="#6B7A99" strokeWidth={2} />)}
      <circle cx={x(firstLive)} cy={y(HISTORY[firstLive].v)} r={6} fill="#2F8F6B" />
      <circle cx={lx} cy={ly} r={16} fill="#E8458B" opacity={0.2} />
      <circle cx={lx} cy={ly} r={9} fill="#E8458B" stroke="#17324D" strokeWidth={3} />
      <g transform={`translate(${lx - (mobile ? 92 : 112)} ${ly - 58})`}>
        <rect width={mobile ? 84 : 100} height={40} rx={20} fill="#17324D" />
        <text x={mobile ? 42 : 50} y={26} textAnchor="middle" className="chart__callout">Today {last.v}%</text>
      </g>
    </svg>
  );
}

export function TripHealth() {
  const { device } = useDevice();
  const mobile = device === 'mobile';
  return (
    <AppFrame>
      <div className="exp">
        <ExpeditionHeader
          step="Summit Odds · Trip health"
          title="Trip health"
          intro="The trip's odds, checked once a day. A rising line means the plan is getting easier for everyone."
        />
        <div className="exp__grid exp__grid--health">
          <Panel aria-labelledby="chart-title">
            <div className="panel__head">
              <h2 id="chart-title" className="h2">Odds over the last two weeks</h2>
            </div>
            <ul className="legend">
              <li><svg width={40} height={10} aria-hidden="true"><line x1={2} x2={38} y1={5} y2={5} stroke="#6B7A99" strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" /></svg> Demo history <span className="muted">(made-up, dotted)</span></li>
              <li><svg width={40} height={10} aria-hidden="true"><line x1={2} x2={38} y1={5} y2={5} stroke="#2F8F6B" strokeWidth={5} strokeLinecap="round" /></svg> Live score <span className="muted">(solid)</span></li>
              <li><svg width={20} height={20} aria-hidden="true"><circle cx={10} cy={10} r={7} fill="#E8458B" stroke="#17324D" strokeWidth={3} /></svg> Today</li>
            </ul>
            <LineChart mobile={mobile} />
            <p className="note-inline"><Icon name="alert" size={18} /> Oct 10 to Oct 22 is demo history, generated so the chart has something to show. Real readings start Oct 23.</p>
          </Panel>
          <div className="stats">
            <Panel className="stat"><p className="muted">Today</p><p className="stat__num">61%</p><p>Likely to happen</p></Panel>
            <Panel className="stat"><p className="muted">Since yesterday</p><p className="stat__num">+9</p><p>Switched to 1 night in Kansas City</p></Panel>
            <Panel className="stat"><p className="muted">Biggest risk</p><p className="stat__num stat__num--sm">Booking late</p><p>Flights usually rise about 3 weeks out</p></Panel>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

export function SummitStamp({ initial = 'before' }: { initial?: 'before' | 'after' }) {
  const { device } = useDevice();
  const mobile = device === 'mobile';
  const [state, setState] = useState(initial);
  return (
    <AppFrame>
      <div className="exp">
        <ExpeditionHeader
          step="Expedition 5 of 5"
          title="Summit Stamp"
          intro="Back from the trip? Stamp the reunion. Every stamp adds to your streak and is co-signed by all four of you."
        />
        {state === 'before' ? (
          <Panel className="stamp-before" crease={!mobile}>
            <div className="stamp-before__faces">
              {CAST.map((f) => <Face key={f.id} color={f.character.color} mood={f.character.mood} accessory={f.character.accessory} size={mobile ? 60 : 84} label={f.name} />)}
            </div>
            <h2 className="h1">Kansas City, Nov 21 to 22</h2>
            <p className="lede">The trip date has passed. If all four of you made it, stamp it.</p>
            <Button variant="primary" size="lg" icon="check" onClick={() => setState('after')} block={mobile}>We made it</Button>
            <p className="muted">Didn't happen? <button type="button" className="link link--btn">Tell the group what got in the way</button></p>
          </Panel>
        ) : (
          <div className="exp__grid exp__grid--stamp">
            <Panel className="stamp-after">
              <div className="stamp-after__art"><Stamp number={1} city="Kansas City" date="Nov 21 2026" size={mobile ? 250 : 340} /></div>
              <h2 className="display">Reunion #1</h2>
              <p className="lede">Stamped and co-signed by Arlo, Beck, Cyrus and Dante.</p>
              <a className="link" href={EXPLORER_URL} target="_blank" rel="noreferrer">View on Solana Explorer <Icon name="external" size={16} /></a>
            </Panel>
            <div className="stack">
              <Panel className="streak" aria-labelledby="streak-title">
                <h3 id="streak-title" className="h3">Your streak</h3>
                <p className="streak__num">1 reunion</p>
                <ol className="streak__track" aria-label="1 of 4 reunions this year">
                  {[1, 2, 3, 4].map((n) => (
                    <li key={n} className={n === 1 ? 'is-done' : ''}>
                      <span>{n === 1 ? <Icon name="flag" size={18} /> : n}</span>
                      <small>{['Nov', 'Feb', 'May', 'Aug'][n - 1]}</small>
                    </li>
                  ))}
                </ol>
                <p className="muted">Meet again by Feb 21 to keep the streak going.</p>
              </Panel>
              <Panel>
                <h3 className="h3">Ready for the next one?</h3>
                <p className="muted">Scout the Route starts fresh with everyone's new weekends.</p>
                <Button variant="primary" block iconRight="arrow-right">Plan reunion #2</Button>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </AppFrame>
  );
}