import { Empty, ErrorState, Loading, Panel } from '../components/ui';
import { AppFrame, useDevice } from '../shell';

export function States() {
  const { device } = useDevice();
  const mobile = device === 'mobile';
  return (
    <AppFrame>
      <div className="exp">
        <div className="exp-head">
          <div className="exp-head__main">
            <p className="exp-head__step">Shared patterns</p>
            <h1 className="h1">Loading, empty and error states</h1>
            <p className="lede">Every wait says what's happening, every empty space offers the next step, and every error says how to fix it.</p>
          </div>
        </div>
        <div className={`states-grid${mobile ? ' is-stacked' : ''}`}>
          <Panel><p className="eyebrow">Loading</p><Loading /></Panel>
          <Panel><p className="eyebrow">Empty</p><Empty title="Invite a friend to start" body="Expeditions open once at least two of you are in Base Camp. Share the code K7M2QX." action="Copy invite link" /></Panel>
          <Panel className="states-grid__wide">
            <p className="eyebrow">Errors</p>
            <div className="stack">
              <ErrorState title="Can't reach the server." body="Check that the backend is running, then try again." />
              <ErrorState title="That invite code didn't match a Base Camp." body="Codes are 6 letters and numbers, like K7M2QX. Check for a 0 that should be an O." action="Re-enter code" />
              <ErrorState title="Solana devnet is slow right now." body="Your signatures are saved. We'll post the record as soon as the network responds." action="Check again" />
            </div>
          </Panel>
        </div>
      </div>
    </AppFrame>
  );
}
