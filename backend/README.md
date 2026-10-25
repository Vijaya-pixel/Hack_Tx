# Backend

TypeScript API (Express). Database: **TigerData** (Postgres + TimescaleDB). Optional Solana for recording fingerprints.
Contains the Toyota "next move" engine (`src/toyota/`) and a clean base: health check, database connection,
TigerData helpers and the chain adapter.

    npm install
    npm run typecheck     # strict TypeScript
    npm test              # 84 tests, no network needed
npm run gemini:check  # confirms your Gemini key and model work
    npm start             # reads backend/.env automatically

## Your keys go in `backend/.env`
Copy `.env.example` to `.env` (it is git-ignored). Only `DATABASE_URL` is needed:
`DATABASE_URL=postgres://tsdbadmin:...@....tsdb.cloud.timescale.com:PORT/tsdb?sslmode=require`
If you get a certificate error, add `PGSSL=insecure` (hackathon use only).

Check it: `curl localhost:8787/api/health` should return `"database":"connected"`.

## The Toyota engine (`src/toyota/`)
All dollar figures come from plain code; there is no AI in the math. Customers and prices are synthetic, and the
car-value model is a simple stated assumption, not a market quote.

| File | What |
|---|---|
| `money.ts` | Loan payment, balance, payoff time, interest, lease payment, month arithmetic |
| `vehicle.ts` | Car value model (stated assumptions) and fuel cost |
| `customers.ts` | Five synthetic customers (Maya, Jake, Sam, Priya, Lena) and a small catalog |
| `advice.ts` | Options, recommendation with its reason, next step, and the value-versus-owed timeline with what-if sliders |
| `explain.ts` | Explanation: Gemini rewords it, a number guard rejects any figure not in the advice, and it falls back to a template |
| `gemini.ts` | Small Gemini REST client (no SDK): model from `GEMINI_MODEL`, key in a header, 12 second timeout |

| Method | Path | What |
|---|---|---|
| GET | `/api/customers`, `/api/customers/:id` | The synthetic customers |
| GET | `/api/customers/:id/advice` | Options, recommendation, next step, assumptions |
| GET | `/api/customers/:id/timeline` | Month-by-month value, amount owed and equity |
| GET | `/api/customers/:id/explain` | Plain-language explanation |

Optional query for advice, timeline and explain: `extraMiles` (-2000 to 3000 a month), `extraPayment` (0 to 2000), `today` (YYYY-MM-DD).
The demo date is fixed at 2026-10-24 so the stories hold; set `DEMO_TODAY` to change it.

## Files
| File | What |
|---|---|
| `src/server.ts` | Express app, JSON error handling, `/api/health`. Add routes where marked |
| `src/db.ts` | The small `Db` interface and `createDbFromEnv()` (connects with `DATABASE_URL`) |
| `src/tigerdata.ts` | `enableHypertable()` and `bucketFloor()` (time_bucket, with a plain Postgres fallback) |
| `src/chain.ts` | Chain adapter: real Solana devnet, a fake for tests, a labeled mock for UI work |
| `src/fingerprint.ts` | Stable SHA-256 fingerprint of any JSON (same as `solana/lib.ts`) |

Env: `GEMINI_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL`, `PGSSL`, `PORT` (8787), `CHAIN=mock` (UI work only; never for the real demo).

The server starts without Solana. To use the real chain, also run `npm install` in `../solana` (the backend loads
those helpers only when it first needs them, and says so clearly if they are missing).

## Not verified here
The TimescaleDB-only steps (`create_hypertable`, `time_bucket`) can't run in the offline test database,
so they are checked by recording the SQL they send and by the plain-Postgres fallback. Confirm on first use.

The previous project's full code (scoring engine, TigerData tables and queries, pact and stamp scripts)
is kept on the `four-corners-archive` branch.
