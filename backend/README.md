# Backend

TypeScript API (Express). Database: **TigerData** (Postgres + TimescaleDB). Optional Solana for recording fingerprints.
This is currently a clean base: health check, database connection, TigerData helpers and the chain adapter.
The app's own routes and tables go in next.

    npm install
    npm run typecheck     # strict TypeScript
    npm test              # 15 tests, no network needed
    npm start             # reads backend/.env automatically

## Your keys go in `backend/.env`
Copy `.env.example` to `.env` (it is git-ignored). Only `DATABASE_URL` is needed:
`DATABASE_URL=postgres://tsdbadmin:...@....tsdb.cloud.timescale.com:PORT/tsdb?sslmode=require`
If you get a certificate error, add `PGSSL=insecure` (hackathon use only).

Check it: `curl localhost:8787/api/health` should return `"database":"connected"`.

## Files
| File | What |
|---|---|
| `src/server.ts` | Express app, JSON error handling, `/api/health`. Add routes where marked |
| `src/db.ts` | The small `Db` interface and `createDbFromEnv()` (connects with `DATABASE_URL`) |
| `src/tigerdata.ts` | `enableHypertable()` and `bucketFloor()` (time_bucket, with a plain Postgres fallback) |
| `src/chain.ts` | Chain adapter: real Solana devnet, a fake for tests, a labeled mock for UI work |
| `src/fingerprint.ts` | Stable SHA-256 fingerprint of any JSON (same as `solana/lib.ts`) |

Env: `DATABASE_URL`, `PGSSL`, `PORT` (8787), `CHAIN=mock` (UI work only; never for the real demo).

## Not verified here
The TimescaleDB-only steps (`create_hypertable`, `time_bucket`) can't run in the offline test database,
so they are checked by recording the SQL they send and by the plain-Postgres fallback. Confirm on first use.

The previous project's full code (scoring engine, TigerData tables and queries, pact and stamp scripts)
is kept on the `four-corners-archive` branch.
