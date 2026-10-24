# Four Corners: project plan

Four friends in four cities. The app finds the weekend that works, scores how likely
the trip is to actually happen, gets everyone to sign a pact, and stamps each reunion.

## Challenges
- Meta (sponsor track): Muse Spark for nudges, Muse Image for art (SVG fallback)
- MLH TigerData: live app state + trip-health time series (hypertable, continuous aggregate)
- MLH Solana: four-signature Pact and Reunion Stamp (devnet)
- MLH .tech: domain
- Skipped: Snowflake (dropped), Gemini, Toyota, Capital One, SerpApi

## Division of labor
The backend decides (plain scoring code, no AI). TigerData remembers. Meta tells the story. Solana makes it a promise.

## Flow
1. Enter name and code
2. "What describes you?" (one sentence) + 2 questions (home city, perfect weekend)
3. Character generated automatically (no user control), drawn in the app's own style
4. Join the group via invite link and enter **Base Camp**
5. Pick an expedition (feature)

## Base Camp expeditions (features)
| Expedition | What it does | Engine |
|---|---|---|
| Scout the Route | Each friend taps free weekends and travel limit; app finds the best weekend and city | Backend scoring |
| Summit Odds | Trip Survival Score, plus a smaller-plan suggestion; trend chart of the score over time | Backend scoring + TigerData |
| Plant the Flag | All four sign the Pact | Solana |
| Countdown | Shared timer and nudges | Meta Spark |
| Summit Stamp | After the trip, co-signed Reunion Stamp and streak | Solana |

## Demo rules
- The other three friends are seeded; one real signup flow is shown live
- Four Solana wallets are test wallets held by one script (say so in the demo)
- Survival Score is a prototype trained on synthetic trips (say so in the demo)
- Only fingerprints go on-chain, never personal data
- Pre-record a fallback demo video; pre-write one Solana transaction

## Fallbacks
- No Muse access: template nudges and rule-based traits (already built), SVG assembler draws characters
- Solana devnet slow: show the pre-written transaction link

## Build order (cut from the bottom)
1. (dropped) Snowflake
2. Solana pact and stamp scripts (done, TypeScript; devnet, memo program, 4 test keypairs)
2b. Backend API on TigerData (done, TypeScript; `npm test`, `npm run typecheck` in backend/)
3. App shell: join flow, character reveal, Base Camp feed
4. Expeditions: Scout the Route, Summit Odds, Plant the Flag
5. Optional: Muse for character art and nudge wording
6. Countdown nudges, Summit Stamp, streak
7. Polish, .tech domain, fallback video, write-up

## Open questions
- Submission deadline (assumed: working by ~8am tomorrow)
- Solana experience (unknown)
- Meta Muse access (unverified; ask at the Meta booth)
