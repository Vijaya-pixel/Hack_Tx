import { useState } from 'react';
import { Button, Field, Icon, Panel, Pill } from '../components/ui';
import { GuideTip, RevealStage, WelcomeScene } from '../components/Scenes';
import { AppFrame, Logo, useDevice } from '../shell';
import { ME, VIBES } from '../data';

export function Welcome() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  return (
    <AppFrame bare>
      <div className="welcome">
        <header className="welcome__bar">
          <Logo small={mobile} />
          {!mobile && <Button variant="quiet" size="sm" onClick={() => go('about')}>Join with a code</Button>}
        </header>
        <div className="welcome__grid">
          <div className="welcome__copy">
            <h1 className="display">Four friends. Four cities. One weekend that actually happens.</h1>
            <p className="lede">Tell us where everyone lives and when they're free. We find the trip most likely to happen, and everyone signs on.</p>
            <div className="welcome__actions">
              <Button variant="primary" size="lg" onClick={() => go('about')} block={mobile}>Start a Base Camp</Button>
              <Button variant="secondary" size="lg" onClick={() => go('about')} block={mobile}>Join with a code</Button>
            </div>
            <ul className="welcome__facts">
              <li><Icon name="calendar" /> Everyone taps the weekends they're free</li>
              <li><Icon name="pin" /> We rank cities by travel time and cost</li>
              <li><Icon name="flag" /> All four sign one shared promise</li>
            </ul>
          </div>
          <div className="welcome__art"><WelcomeScene /></div>
        </div>
      </div>
    </AppFrame>
  );
}

export function AboutYou() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  const [vibe, setVibe] = useState(ME.vibe);
  const [describe, setDescribe] = useState(ME.describe);
  return (
    <AppFrame bare>
      <div className="about">
        <header className="welcome__bar">
          <Logo small={mobile} />
          <span className="steps" aria-label="Step 1 of 2">
            <span className="steps__dot is-on" /><span className="steps__dot" />
            <span>Step 1 of 2</span>
          </span>
        </header>
        <div className="about__grid">
          <Panel className="about__form" crease={!mobile}>
            <p className="eyebrow">Joining The Long Weekenders</p>
            <h1 className="h1">About you</h1>
            <p className="lede">Three quick answers. Your character is drawn from them.</p>
            <form onSubmit={(e) => { e.preventDefault(); go('reveal'); }}>
              <Field label="Your name" htmlFor="name">
                <input id="name" className="input" defaultValue={ME.name} autoComplete="given-name" />
              </Field>
              <Field label="What describes you?" htmlFor="describe" hint="A sentence or two, in your own words. Hobbies, habits, the thing your friends tease you about.">
                <textarea id="describe" className="input textarea" rows={4} maxLength={200} value={describe} onChange={(e) => setDescribe(e.target.value)} />
                <span className="field__count">{describe.length} of 200</span>
              </Field>
              <Field label="Which city do you call home?" htmlFor="city" hint="We use this to work out travel time. Only the city is shared.">
                <div className="input-icon">
                  <Icon name="pin" />
                  <input id="city" className="input" defaultValue={ME.city} list="cities" />
                </div>
                <datalist id="cities"><option value="Austin" /><option value="Atlanta" /><option value="Chicago" /><option value="Seattle" /></datalist>
              </Field>
              <fieldset className="field">
                <legend className="field__label">Your perfect weekend</legend>
                <p className="field__hint">Pick the one that sounds most like you.</p>
                <div className="pills">
                  {VIBES.map((v) => <Pill key={v} selected={v === vibe} onClick={() => setVibe(v)}>{v}</Pill>)}
                </div>
              </fieldset>
              <div className="about__submit">
                <Button type="submit" variant="primary" size="lg" block={mobile} iconRight="arrow-right">Meet my character</Button>
              </div>
            </form>
          </Panel>
          {!mobile && (
            <aside className="about__side">
              <div className="mystery">
                <div className="mystery__circle">
                  <svg viewBox="0 0 140 190" width={150} height={200} aria-hidden="true">
                    <path d="M70 40 C97 40 108 60 108 92 L108 128 C108 148 92 158 70 158 C48 158 32 148 32 128 L32 88 C32 58 45 40 70 40 Z" fill="#F7FBFF" stroke="#17324D" strokeWidth={3} strokeDasharray="8 8" />
                    <text x={70} y={112} textAnchor="middle" fontFamily="Bagel Fat One, sans-serif" fontSize={44} fill="#17324D">?</text>
                  </svg>
                </div>
              </div>
              <GuideTip>
                <b>You don't pick your character.</b> We draw it from your answers, so everyone's is a little surprise. It can't be edited later.
              </GuideTip>
            </aside>
          )}
        </div>
      </div>
    </AppFrame>
  );
}

export function Reveal() {
  const { device, go } = useDevice();
  const mobile = device === 'mobile';
  const c = ME.character;
  return (
    <AppFrame bare>
      <div className="reveal">
        <header className="welcome__bar">
          <Logo small={mobile} />
          <span className="steps" aria-label="Step 2 of 2">
            <span className="steps__dot is-on" /><span className="steps__dot is-on" />
            <span>Step 2 of 2</span>
          </span>
        </header>
        <div className="reveal__body">
          <p className="eyebrow">Your character is ready</p>
          <RevealStage friend={ME} size={mobile ? 190 : 270} />
          <h1 className="display reveal__name">{ME.name}, {c.title}</h1>
          <p className="lede reveal__tagline">{c.tagline}</p>
          <ul className="traits" aria-label="Character traits">
            <li><span>Carries</span><b>A trail backpack</b></li>
            <li><span>Mood</span><b>Excited</b></li>
            <li><span>Home</span><b>{ME.city}</b></li>
            <li><span>Perfect weekend</span><b>{ME.vibe}</b></li>
          </ul>
          <p className="reveal__note"><Icon name="lock" size={16} /> Drawn from what you wrote. Characters can't be edited.</p>
          <Button variant="primary" size="lg" block={mobile} onClick={() => go('basecamp')} iconRight="arrow-right">Enter Base Camp</Button>
        </div>
      </div>
    </AppFrame>
  );
}