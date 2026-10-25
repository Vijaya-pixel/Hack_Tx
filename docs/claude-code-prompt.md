# Prompt for Claude Code: Round-Up (Toyota Financial Services concept)

Copy everything below the line into Claude Code, opened in the root of the Hack-Tx repo.

---

You are building a hackathon project in this repo. The deadline is tomorrow morning, so favor a finished, working demo over extra features. Work in the order of the checkpoints below and commit after each one.

## 0. Clean up first

This repo held earlier projects. Before writing anything, list every tracked and untracked file (`git ls-files` and `git status`), ignoring `node_modules/`.

- **Keep only these:**
  - `backend/src/tigerdata.ts`, the TigerData/TimescaleDB helpers: `timescaleAvailable`, `enableHypertable`, `bucketFloor`.
  - `backend/test/tigerdata.test.ts`.
  - `backend/src/db.ts`, the `Db` interface and `createDbFromEnv`.
  - `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/.env.example`, `backend/.gitignore`.
  - The root `.gitignore`.
  - `docs/claude-code-prompt.md`, this prompt.
- **Delete everything else** that came from earlier projects: friends or trip apps, NextMove, Solana, `design/`, and old docs. If you're unsure about a file, ask me before deleting it.
- **Don't break the TigerData module.** You may add to it, but run `npm test` in `backend/` and keep its tests passing.
- **Never touch or print `.env` files.** They hold my keys.

## 1. What we're building

**Round-Up** is a customer dashboard concept for **Toyota Financial Services**. It rounds a customer's everyday purchases up to the next dollar and puts the spare change toward the **principal** of their Toyota car loan, so they can see how many months and how much interest they save.

It targets three challenges. Each technology has to do a real job:

1. **Toyota Financial Services, "What's Your Next Move?"** It's judged on four pillars: PERSONALIZE, SIMPLIFY, GUIDE and VALUE.
2. **Best Use of Tiger Data.** Card transactions are time-series data. They go into a hypertable, and a **continuous aggregate** gives daily and weekly round-up totals.
3. **Best Use of Snowflake.** Snowflake holds the customer and loan records and the hardship requests. **Snowflake Cortex** (`SNOWFLAKE.CORTEX.COMPLETE`) turns the loan math into plain-language advice.

## 2. Ground rules (judges will check these)

- **All money math lives in tested backend code, never in the AI and never in the frontend.** The frontend shows numbers the API returns.
- **The AI only rewords numbers we already computed.** Every number in a Cortex reply must appear in the facts we sent it. If any number doesn't match, or Cortex fails or times out, show a built-in template explanation instead. Label each one ("AI explanation · Snowflake Cortex" or "Standard explanation").
- **All data is synthetic, and the screen says so.** Use a small "Demo data" label. No real bank, Plaid or card connections.
- **Branding.** Use the Toyota-red palette, but add the footer "Concept for Toyota Financial Services. Not an official Toyota app." Don't use Toyota logo image files; a text wordmark placeholder is fine.
- **Hardship actions are requests, not instant changes.** Use button text like "Request a payment pause," and the result is "Request sent. A TFS specialist will review it."
- **No dead buttons.** Everything on screen either works or is removed.

## 3. The demo customer (one loan, used everywhere)

- Alex Rivera, 2024 Toyota RAV4 Hybrid.
- Loan balance $28,000, 5.9% APR, 48 months remaining.
- The monthly payment is computed from those three numbers (roughly $656), not hardcoded.
- Extra round-up money is applied to principal once a week.

## 4. Architecture

Keep two folders:

- **`backend/`** is a TypeScript API: Node 22, Express, run with `tsx --env-file-if-exists=.env`, tested with `node --test`. It's the only thing that talks to TigerData and Snowflake.
- **`web/`** is a Next.js (App Router), TypeScript, Tailwind and Recharts frontend. Set up a rewrite so `/api/*` goes to the backend, which avoids CORS.

Add a root README with three commands that run everything locally, and list every environment variable in `backend/.env.example`.

### TigerData (`DATABASE_URL`)

- Create a `transactions` table (`ts timestamptz, customer_id, merchant, category, amount_cents, roundup_cents`) and make it a hypertable with the existing `enableHypertable`.
- Add a helper to `tigerdata.ts` that creates a continuous aggregate with `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)` plus `add_continuous_aggregate_policy`, safe to run on every startup. Use it for `roundups_daily` (sum and count per customer per day). Test the helper with a recording fake database, like the existing tests do.
- **Seed** about 12 weeks of realistic synthetic purchases for Alex: coffee, gas, groceries, lunch and so on. Make them deterministic (a seeded random generator), so the numbers are the same on every run.
- **Live feed for the demo:** an endpoint starts or stops a simulator that inserts one new purchase every 3 seconds. The frontend polls the feed.
- **Fallback:** if `DATABASE_URL` is missing or TimescaleDB isn't available, use plain SQL or in-memory data so the app still runs, and `/api/health` reports which mode is active.

### Snowflake

- Use the `snowflake-sdk` package. Read the account, user, warehouse, database, schema and role from environment variables. Support both password auth and key-pair auth (`SNOWFLAKE_PRIVATE_KEY_PATH`), since newer accounts may block password-only sign-in.
- Add a `npm run snowflake:setup` script that creates the `CUSTOMERS`, `LOANS` and `HARDSHIP_REQUESTS` tables and seeds Alex.
- Add a `npm run snowflake:check` script that connects, runs `SELECT 1` and one tiny Cortex call, and prints which parts worked. It must never print secrets.
- **Cortex:** call `SELECT SNOWFLAKE.CORTEX.COMPLETE(?, ?)` with bound parameters. Read the model from `SNOWFLAKE_CORTEX_MODEL`, with a sensible default. If my account's region doesn't offer that model, the check script should say so clearly, along with the cross-region setting to enable.
- **Fallback:** if Snowflake isn't configured, serve Alex from a local seed file and use the template explanations, and `/api/health` says so.

## 5. Backend math (`backend/src/loan.ts`, fully unit-tested)

- `roundUp(amountCents)`: cents to the next dollar; an exact dollar gives 0.
- `monthlyPayment(balance, apr, months)`.
- `payoff(balance, apr, payment, extraPerWeek)`: months to payoff, total interest and the month-by-month balance. Weekly extra goes to principal.
- `compare(standard, withRoundUps)`: months saved, interest saved, and the payoff date for each.
- `biweekly(...)`: the effect of paying half the payment every two weeks (26 half-payments a year).
- Round all money only for display. Test edge cases: zero extra, extra big enough to pay off quickly, and a 0% APR.

## 6. API (all JSON, with clear errors)

| Endpoint | Returns |
|---|---|
| `GET /api/health` | Which database, Snowflake and AI mode is active. |
| `GET /api/customer` | Alex's profile and loan, from Snowflake or the fallback. |
| `GET /api/roundups?range=12w` | Daily and weekly totals from the continuous aggregate, plus the actual average per week. |
| `GET /api/feed?limit=20` | The latest transactions, each with its round-up. |
| `POST /api/simulator/start` and `/stop` | Turns the live feed on or off. |
| `GET /api/plan?extraPerWeek=` | Both payoff curves and the KPIs. The default is Alex's real average from TigerData; allow $0 to $100. |
| `GET /api/explain?extraPerWeek=` | The Cortex or template explanation, its source, and why any reply was rejected. |
| `POST /api/hardship` | Saves a request (pause, bi-weekly or maintenance credit) to `HARDSHIP_REQUESTS` and returns its status. |

## 7. Frontend screens (one dashboard page)

1. **Header:** the wordmark placeholder, "Alex Rivera · 2024 RAV4 Hybrid," and a loan pill ("$28,000 · 5.9% APR · 48 months left").
2. **Your round-ups (PERSONALIZE):** a weekly round-up bar chart from TigerData, plus "You've rounded up $X in 12 weeks."
3. **What if (SIMPLIFY and VALUE):**
   - Two payoff curves: standard and with round-ups.
   - A slider for extra dollars per week. It starts at Alex's real average and shows a marker for it.
   - Three KPI cards: months saved, interest saved and new payoff date.
   - One line: "Round-ups go to principal, which is why they save interest."
4. **Live feed:** "Coffee $4.20 → $0.80 to your loan," updating while the simulator runs, with a Start/Stop demo button.
5. **Ask (GUIDE):** a short explanation from `/api/explain` with its source label. Include three preset questions ("Is this worth it?", "What if I double it?", "What if money is tight?"), which only ever re-run the explanation with different inputs; no free-form chat.
6. **Money is tight? (self-service):** three requests (payment pause, switch to bi-weekly, apply a $50 maintenance credit). The bi-weekly option shows its computed effect before you send it.

Design: clean and calm, readable on a laptop projector, with loading, empty and error states. It should work at 1280 px and on a phone.

## 8. Checkpoints (commit after each)

1. Cleanup done; the TigerData tests still pass.
2. Loan math plus tests.
3. TigerData: transactions, continuous aggregate, seed, simulator, fallback.
4. Snowflake: setup and check scripts, customer, hardship, and Cortex with the number guard and template fallback.
5. API routes plus tests, using fakes, so no test touches the network.
6. Frontend.
7. README: how to run, environment variables, what's synthetic, and a 2-minute demo script.

**Commits:** author them as me, using the git config already set. Don't add Co-Authored-By lines. Instead, end each message with `Assisted-by: Claude Code`. Never commit `.env`.

**Done means:**
- `npm test` passes in `backend/`.
- `npm run build` passes in `web/`.
- The app runs with no keys (fallback mode) and with my keys (TigerData plus Snowflake).
- Every number on screen comes from the API.

When you finish, tell me what's real and what's fallback, and how to run `snowflake:check`.
