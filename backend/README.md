# Four Corners backend

TypeScript API (Express). Live app state and the trip-health time series live in
**TigerData** (Postgres + TimescaleDB). Solana records the pact and the stamp.

    npm install
    npm run typecheck     # strict TypeScript
    npm test              # 43 tests; the API suite runs on the memory store AND a real Postgres engine (PGlite)

## Run it

| Goal | Command |
|---|---|
| Quick local run, no database (data is lost on restart) | `CHAIN=mock npm start` |
| With TigerData | `DATABASE_URL="postgres://..." CHAIN=mock npm start` |
| Real Solana devnet (needs `../solana` wallets and airdrop) | add nothing, just drop `CHAIN=mock` |

`CHAIN=mock` is for front-end work only: responses are labeled mock and the "blockchain" is an
in-memory ledger that resets on restart. Never use it for the real demo.

## Your keys go in `backend/.env`
`npm start` reads `backend/.env` automatically (it is git-ignored, so it never gets committed).
Copy `.env.example` to `.env` and fill in `DATABASE_URL`. Nothing else is required.

## TigerData setup
1. Create a service at https://console.cloud.timescale.com (TigerData). Copy its connection string.
2. Put it in `.env` as `DATABASE_URL=postgres://tsdbadmin:...@....tsdb.cloud.timescale.com:PORT/tsdb?sslmode=require`
3. `npm start`. On startup the app creates its tables, turns `fc_score_events` into a hypertable,
   and tries to create the daily continuous aggregate `fc_score_daily`.
4. If the connection fails on certificates, set `PGSSL=insecure` (hackathon use only).

## Show the judges the TigerData code
| Open this | To see |
|---|---|
| `src/tigerdata.ts` | **All the TigerData-specific code in one file**: hypertable, continuous aggregate, `time_bucket`, hyperfunctions, and the showcase queries |
| `tigerdata/schema.sql` | The same SQL as plain text, generated from that file (`npm run schema:export`). Paste it into the TigerData console |
| `src/pgstore.ts` | How the app reads and writes its data on top of it |

Live demo idea: run the "Showcase queries" at the bottom of `tigerdata/schema.sql` in the TigerData SQL editor
(replace `YOURCODE` with a group code from `SELECT code FROM fc_groups;`). They show the hypertable, daily
`time_bucket` trend, `first()` / `last()` opening and closing scores, `time_bucket_gapfill` with `locf`, and the
continuous aggregate.

## What lives in TigerData
| Table | What |
|---|---|
| `fc_groups`, `fc_members`, `fc_availability`, `fc_feed`, `fc_stamps` | Live app state |
| `fc_score_events` (**hypertable**) | One row each time the group's best plan changes: survival score over time |
| `fc_score_daily` (**continuous aggregate**) | Daily rollup (avg, best, samples) of the score |

`GET /api/groups/:code/trend?bucket=day|hour` returns the score history using `time_bucket`
on TimescaleDB (and `date_trunc` on plain Postgres). The first demo-crew join also writes
14 days of *synthetic* history, marked `seeded = true`, so the chart has something to show.

### What is and isn't verified
- Verified: all table logic, queries, bucketing, persistence across restarts and the pg driver path,
  against a real Postgres engine (PGlite).
- NOT verified here: the TimescaleDB-only steps (hypertable, continuous aggregate, `time_bucket`, `first`/`last`, gapfill),
  because TimescaleDB isn't available offline. They run inside try/catch: if any step fails the app
  logs nothing and falls back to plain Postgres. Check `GET /api/health` and your service console
  after first run; `fc_score_events` should appear under hypertables.

## Env
`DATABASE_URL`, `PGSSL=insecure`, `PORT` (8787), `CHAIN=mock`, `DEMO_MODE=0` (turns off demo friends),
`ALLOW_TAMPER_DEMO=1` (enables the tamper demo endpoint).

## Endpoints
| Method | Path | What |
|---|---|---|
| GET | /api/health, /api/cities | status (store, chain), city list |
| POST | /api/groups | create group + creator (name, describe, city, vibe) |
| POST | /api/groups/:code/join | join with an invite code |
| GET | /api/groups/:code | group, members, characters, stage, weekends to pick from |
| POST | /api/groups/:code/demo-friends | add the seeded cast (body `{"fillMine":true}` fills your weekends too) |
| POST | /api/groups/:code/availability | free weekends + max travel hours (token) |
| GET | /api/groups/:code/scout?nights=2 | Scout the Route: ranked weekend + city plans |
| GET | /api/groups/:code/odds?city=&weekend=&nights= | Summit Odds + smaller plans that score higher |
| GET | /api/groups/:code/trend?bucket=day | trip health over time |
| POST | /api/groups/:code/pact | Plant the Flag (co-signed on Solana) |
| GET | /api/groups/:code/pact/verify | recompute fingerprint, check chain |
| POST | /api/groups/:code/stamp | Summit Stamp, streak +1 |
| GET | /api/groups/:code/nudges | countdown and prompts (`?today=YYYY-MM-DD` to time travel) |
| GET/POST | /api/groups/:code/feed | Base Camp feed |
| POST | /api/groups/:code/debug/tamper | demo only: changes stored pact data so verify fails |

Identity: join/create returns a secret `token`; send it as header `x-member-token`.
