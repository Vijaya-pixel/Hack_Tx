import { useState } from 'react';
import { Character, Compass, Face } from '../components/Character';
import { Button, Chip, Empty, ErrorState, FaceStamp, Field, Icon, Loading, Meter, Panel, Pill, Sign, Signpost, Slider, Stamp, Stepper } from '../components/ui';
import { SIGNS } from './BaseCamp';
import { Logo } from '../shell';
import { BODY_COLORS, CAST, type Accessory, type BodyColor, type Mood, type Pose } from '../data';

const COLORS: { name: string; token: string; hex: string; use: string; contrast: string; dark?: boolean }[] = [
  { name: 'Ink navy', token: '--ink', hex: '#17324D', use: 'Text, outlines, button shadows', contrast: '12.6 : 1 on snow', dark: true },
  { name: 'Snow', token: '--snow', hex: '#F7FBFF', use: 'Panels and surfaces', contrast: 'Base for body text' },
  { name: 'Sky', token: '--sky', hex: '#8FD0F2', use: 'Page background', contrast: 'Ink on sky 7.8 : 1' },
  { name: 'Pale sky', token: '--pale-sky', hex: '#CDEAF8', use: 'Reveal circle, meter track, scenes', contrast: 'Ink on pale sky 10.5 : 1' },
  { name: 'Pine', token: '--pine', hex: '#2F8F6B', use: 'Success graphics, checks, live line', contrast: 'Graphics only (3.8 : 1). Not for text', dark: true },
  { name: 'Meadow', token: '--meadow', hex: '#7CC57A', use: 'Ground, "use this plan" buttons', contrast: 'Ink on meadow 6.3 : 1' },
  { name: 'Sun yellow', token: '--sun', hex: '#FFC72C', use: 'Primary buttons, nudge notes', contrast: 'Ink on sun 8.4 : 1' },
  { name: 'Berry', token: '--berry', hex: '#E8458B', use: 'Focus rings, accents, highlights', contrast: 'Graphics only (3.6 : 1 on snow)', dark: true },
  { name: 'Rock', token: '--rock', hex: '#6B7A99', use: 'Mountains, demo lines, locked icons', contrast: 'Graphics only (4.2 : 1 on snow)', dark: true },
  { name: 'Wood', token: '--wood', hex: '#C48A4A', use: 'Signpost and signs', contrast: 'Ink on wood 4.4 : 1 (bold 18px+)' },
  { name: 'Dark wood', token: '--wood-dark', hex: '#9D6B34', use: 'Post, grain, sign edges', contrast: 'Decorative', dark: true },
];

const SUPPORT = [
  { name: 'Ink soft', hex: '#3F5670', use: 'Secondary text (7.3 : 1 on snow)' },
  { name: 'Locked grey', hex: '#D5DCE7', use: 'Locked signs (ink text 9.5 : 1)' },
  { name: 'Success wash', hex: '#E4F4E3', use: '"All 4 signed" box' },
  { name: 'Alert wash', hex: '#FCE3EE', use: '"Data changed" box' },
];

const MOODS: Mood[] = ['calm', 'excited', 'happy', 'cool'];
const POSES: Pose[] = ['standing', 'waving', 'thinking', 'jumping', 'leaning'];
const ACCS: Accessory[] = ['thermos', 'backpack', 'chef hat', 'headphones', 'none'];

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="ds-section" id={id} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="h1">{title}</h2>
      {intro && <p className="lede">{intro}</p>}
      {children}
    </section>
  );
}

export function DesignSystem() {
  const [pill, setPill] = useState('Eating well');
  const [chips, setChips] = useState(['Nov 21']);
  const [hours, setHours] = useState(8);
  const [nights, setNights] = useState(2);
  const [color, setColor] = useState<BodyColor>('orange');
  const [acc, setAcc] = useState<Accessory>('backpack');
  const [mood, setMood] = useState<Mood>('excited');
  const [pose, setPose] = useState<Pose>('waving');
  return (
    <div className="fc fc--desktop ds">
      <header className="ds-hero">
        <Logo />
        <h1 className="display">Base Camp design system</h1>
        <p className="lede">Flat, hand-drawn and bright. Outlines belong to things you can touch or that are alive: characters, signs and buttons. Everything else stays quiet.</p>
        <nav className="ds-nav" aria-label="Sections">
          {['Colors', 'Type', 'Buttons', 'Inputs', 'Signs', 'Panels', 'Meter', 'Characters', 'Pieces', 'States'].map((s) => <a key={s} href={`#ds-${s.toLowerCase()}`} onClick={(e) => { e.preventDefault(); document.getElementById(`ds-${s.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth' }); }}>{s}</a>)}
        </nav>
      </header>

      <Section id="ds-colors" title="Colors" intro="Eleven brand colors plus four support tints. Contrast is listed for text use; colors marked graphics only never carry body text.">
        <div className="swatches">
          {COLORS.map((c) => (
            <div key={c.token} className="swatch">
              <span className="swatch__chip" style={{ background: c.hex }}><span className={c.dark ? 'on-dark' : ''}>Aa</span></span>
              <b>{c.name}</b>
              <code>{c.hex} · {c.token}</code>
              <span>{c.use}</span>
              <span className="muted">{c.contrast}</span>
            </div>
          ))}
        </div>
        <h3 className="h3">Support tints</h3>
        <div className="swatches swatches--small">
          {SUPPORT.map((c) => (
            <div key={c.hex} className="swatch">
              <span className="swatch__chip" style={{ background: c.hex }} />
              <b>{c.name}</b><code>{c.hex}</code><span>{c.use}</span>
            </div>
          ))}
        </div>
        <h3 className="h3">Character body colors</h3>
        <div className="swatches swatches--small">
          {(Object.keys(BODY_COLORS) as BodyColor[]).map((k) => (
            <div key={k} className="swatch"><span className="swatch__chip swatch__chip--round" style={{ background: BODY_COLORS[k] }} /><b>{k}</b><code>{BODY_COLORS[k]}</code></div>
          ))}
        </div>
      </Section>

      <Section id="ds-type" title="Type" intro="Bagel Fat One for headlines and big numbers. Figtree for everything you read. Sentence case everywhere, no all-caps labels.">
        <Panel className="type-specimen">
          <div className="type-row"><span className="type-meta">Display · Bagel Fat One 64 / 1.05 desktop, 40 mobile</span><p className="display">One weekend that actually happens.</p></div>
          <div className="type-row"><span className="type-meta">Heading 1 · Bagel 44 / 1.1, 30 mobile</span><p className="h1">Scout the Route</p></div>
          <div className="type-row"><span className="type-meta">Heading 2 · Bagel 28 / 1.15, 23 mobile</span><p className="h2">Best plans for all four</p></div>
          <div className="type-row"><span className="type-meta">Heading 3 · Figtree 800 20</span><p className="h3">Your streak</p></div>
          <div className="type-row"><span className="type-meta">Big number · Bagel 72</span><p className="meter__num" style={{ fontSize: 72 }}>52<small>%</small></p></div>
          <div className="type-row"><span className="type-meta">Lede · Figtree 500 20 / 1.5</span><p className="lede">Tell us where everyone lives and when they're free.</p></div>
          <div className="type-row"><span className="type-meta">Body · Figtree 500 17 / 1.55, 16 mobile</span><p>Door to door, including the airport. Plans longer than this for you are left out.</p></div>
          <div className="type-row"><span className="type-meta">Small · Figtree 600 15, ink soft</span><p className="muted">Each chip is a Saturday. Dots show who else is free.</p></div>
        </Panel>
      </Section>

      <Section id="ds-buttons" title="Buttons" intro="Pills with a 3px navy outline and a solid navy offset shadow. Pressing pushes the button down onto its shadow. Labels say exactly what happens.">
        <Panel>
          <div className="ds-row">
            <div className="ds-cell"><Button variant="primary" size="lg">Start a Base Camp</Button><span className="muted">Primary, large</span></div>
            <div className="ds-cell"><Button variant="primary">Check the odds</Button><span className="muted">Primary</span></div>
            <div className="ds-cell"><Button variant="primary" pressed>Sign together</Button><span className="muted">Pressed</span></div>
            <div className="ds-cell"><Button variant="secondary">Join with a code</Button><span className="muted">Secondary</span></div>
            <div className="ds-cell"><Button variant="pine" size="sm">Use this plan</Button><span className="muted">Go (meadow), small</span></div>
            <div className="ds-cell"><Button variant="demo" size="sm" icon="alert">Tamper with the data</Button><span className="muted">Demo only</span></div>
            <div className="ds-cell"><Button variant="quiet" size="sm" icon="arrow-left">Back to Base Camp</Button><span className="muted">Quiet</span></div>
            <div className="ds-cell"><Button variant="primary" disabled>Signing…</Button><span className="muted">Disabled</span></div>
            <div className="ds-cell"><Button variant="primary" className="is-focus">Enter Base Camp</Button><span className="muted">Keyboard focus</span></div>
          </div>
          <p className="muted">Focus: 3px berry ring with a 3px snow gap, so it shows on sky, snow and sun. Minimum height 44px on mobile (small buttons included).</p>
        </Panel>
      </Section>

      <Section id="ds-inputs" title="Inputs and choices" intro="Selected states always add a check mark, so nothing depends on color alone.">
        <div className="ds-split">
          <Panel>
            <Field label="Which city do you call home?" htmlFor="ds-city" hint="Only the city is shared."><div className="input-icon"><Icon name="pin" /><input id="ds-city" className="input" defaultValue="Austin" /></div></Field>
            <Field label="What describes you?" htmlFor="ds-desc"><textarea id="ds-desc" className="input textarea" rows={3} defaultValue="Up for anything. Will hike, climb or road trip on a moment's notice." /></Field>
            <Slider label="Longest trip I'll take" value={hours} min={2} max={12} onChange={setHours} format={(v) => `${v} hours`} />
          </Panel>
          <Panel>
            <p className="field__label">Pills (pick one)</p>
            <div className="pills">{['Slow and cozy', 'Something new', 'Eating well', 'Out late', 'Fresh air'].map((v) => <Pill key={v} selected={pill === v} onClick={() => setPill(v)}>{v}</Pill>)}</div>
            <p className="field__label">Weekend chips (pick many)</p>
            <div className="chips chips--ds">
              {['Nov 14', 'Nov 21', 'Nov 28'].map((d) => <Chip key={d} selected={chips.includes(d)} onClick={() => setChips(chips.includes(d) ? chips.filter((c) => c !== d) : [...chips, d])} sub={<span className="muted">{d === 'Nov 21' ? '4/4 free' : '2/4 free'}</span>}>{d}</Chip>)}
            </div>
            <p className="field__label">Stepper</p>
            <Stepper value={nights} min={1} max={3} onChange={setNights} unit={(v) => (v === 1 ? 'night' : 'nights')} />
          </Panel>
        </div>
      </Section>

      <Section id="ds-signs" title="Signs and the signpost" intro="Expeditions are arrow signs on a wooden post, alternating direction. Locked signs turn grey, show a lock, and say why.">
        <div className="ds-split">
          <Panel>
            <div className="stack">
              <Sign sign={SIGNS[0]} dir="right" />
              <Sign sign={SIGNS[2]} dir="left" />
              <Sign sign={{ id: 'x', title: 'Summit Odds', detail: 'Open. See how likely it is' }} dir="right" />
              <Sign sign={SIGNS[3]} dir="left" />
            </div>
            <p className="muted">Done shows a check, the next step gets a sun-yellow face and a nudge, locked is grey with a reason. Signs are full buttons.</p>
          </Panel>
          <Panel tone="pale"><Signpost signs={SIGNS} /></Panel>
        </div>
      </Section>

      <Section id="ds-panels" title="Panels" intro="Folded trail-map sheets: snow white, rounded, with a small folded corner at top right. Flat, no outline, no shadow. Big sheets can show a faint center crease.">
        <div className="ds-split">
          <Panel><h3 className="h3">Standard sheet</h3><p className="muted">Used for forms, lists and summaries. 24px radius, 28px folded corner, 32px padding on desktop and 20px on mobile.</p></Panel>
          <Panel crease><h3 className="h3">Sheet with crease</h3><p className="muted">For the biggest sheet on a page, like the plan list or the promise.</p></Panel>
        </div>
        <div className="ds-split">
          <div className="note note--a"><p>Dante has not marked weekends in December yet. A quick tap would firm up 3 plans.</p></div>
          <div className="result result--ok"><p className="result__title"><span className="result__icon"><Icon name="check" size={20} strokeWidth={3.5} /></span> All 4 signed</p><p>The promise is recorded.</p></div>
          <div className="result result--bad"><p className="result__title"><span className="result__icon"><Icon name="alert" size={20} /></span> Data changed</p><p>This no longer matches the signed record.</p></div>
        </div>
      </Section>

      <Section id="ds-meter" title="Score meter" intro="A ring that fills with the odds. The number and a plain label always sit inside, so the color is never the only signal.">
        <Panel>
          <div className="ds-row ds-row--center">
            <Meter value={34} size={200} />
            <Meter value={52} size={200} />
            <Meter value={61} size={200} />
            <Meter value={82} size={200} />
            <div className="ds-cell"><Meter value={52} size={76} /><span className="muted">Row size</span></div>
          </div>
          <p className="muted">Under 45 berry, 45 to 59 sun, 60 and up pine. Labels: Needs work, Could go either way, Likely to happen, Looking great.</p>
        </Panel>
      </Section>

      <Section id="ds-characters" title="Character component" intro="One component, four props: color, accessory, mood and pose. Bean body, big white eyes, stubby legs, white shoes, round hands. Characters are generated from a person's answers and never edited.">
        <Panel>
          <div className="cast">
            {CAST.map((f) => (
              <figure key={f.id} className="cast__item">
                <div className="cast__stage"><Character {...f.character} size={190} /></div>
                <figcaption><b>{f.name}</b><span>{f.city} · {f.character.accessory} · {f.character.mood} · {f.character.pose}</span></figcaption>
              </figure>
            ))}
            <figure className="cast__item">
              <div className="cast__stage"><Compass size={120} /></div>
              <figcaption><b>Compass</b><span>The guide. Gives tips and nudges</span></figcaption>
            </figure>
          </div>
        </Panel>
        <Panel>
          <div className="builder">
            <div className="builder__stage"><Character color={color} accessory={acc} mood={mood} pose={pose} size={240} /></div>
            <div className="builder__controls">
              <h3 className="h3">Try the props</h3>
              <p className="field__label">Color</p>
              <div className="pills">{(Object.keys(BODY_COLORS) as BodyColor[]).map((c) => <Pill key={c} selected={c === color} onClick={() => setColor(c)}>{c}</Pill>)}</div>
              <p className="field__label">Accessory</p>
              <div className="pills">{ACCS.map((a) => <Pill key={a} selected={a === acc} onClick={() => setAcc(a)}>{a}</Pill>)}</div>
              <p className="field__label">Mood</p>
              <div className="pills">{MOODS.map((m) => <Pill key={m} selected={m === mood} onClick={() => setMood(m)}>{m}</Pill>)}</div>
              <p className="field__label">Pose</p>
              <div className="pills">{POSES.map((p) => <Pill key={p} selected={p === pose} onClick={() => setPose(p)}>{p}</Pill>)}</div>
              <code className="codeline">{`<Character color="${color}" accessory="${acc}" mood="${mood}" pose="${pose}" />`}</code>
            </div>
          </div>
        </Panel>
        <div className="ds-split">
          <Panel>
            <h3 className="h3">Moods</h3>
            <div className="matrix">{MOODS.map((m) => <figure key={m}><Character color="blue" mood={m} size={130} /><figcaption>{m}</figcaption></figure>)}</div>
          </Panel>
          <Panel>
            <h3 className="h3">Poses</h3>
            <div className="matrix">{POSES.map((p) => <figure key={p}><Character color="orange" mood="happy" pose={p} size={130} /><figcaption>{p}</figcaption></figure>)}</div>
          </Panel>
        </div>
        <Panel>
          <h3 className="h3">Accessories</h3>
          <div className="matrix">{ACCS.map((a) => <figure key={a}><Character color="green" accessory={a} mood="calm" size={130} /><figcaption>{a}</figcaption></figure>)}</div>
        </Panel>
      </Section>

      <Section id="ds-pieces" title="Smaller pieces" intro="Faces for avatars and signatures, the reunion stamp, and the guide's speech bubble.">
        <div className="ds-split">
          <Panel>
            <h3 className="h3">Faces</h3>
            <div className="ds-row">{CAST.map((f) => <Face key={f.id} color={f.character.color} mood={f.character.mood} accessory={f.character.accessory} size={64} label={f.name} />)}{CAST.map((f) => <Face key={`s${f.id}`} color={f.character.color} mood={f.character.mood} size={36} />)}</div>
            <h3 className="h3">Signature stamps</h3>
            <div className="signers">{CAST.map((f, i) => <FaceStamp key={f.id} friend={f} signed={i < 2} />)}</div>
          </Panel>
          <Panel className="center">
            <Stamp number={1} city="Kansas City" date="Nov 21 2026" size={260} />
          </Panel>
        </div>
      </Section>

      <Section id="ds-states" title="States" intro="Loading uses a small bouncing character. Empty states always offer the next step. Errors say what went wrong and how to fix it, in plain words.">
        <div className="ds-split">
          <Panel><Loading /></Panel>
          <Panel><Empty title="Invite a friend to start" body="Share the code K7M2QX. Expeditions open once two of you are in." action="Copy invite link" /></Panel>
        </div>
        <Panel><ErrorState title="Can't reach the server." body="Check that the backend is running, then try again." /></Panel>
      </Section>
    </div>
  );
}
