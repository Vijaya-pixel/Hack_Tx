# Four Corners backend

    npm install
    npm test                         # 12 tests, no network needed
    CHAIN=mock npm start             # front-end development (responses flagged "mock", never use for the real demo)
    npm start                        # real Solana devnet (needs ../solana wallets + airdrop)
    ENGINE=snowflake npm start       # ranking runs inside Snowflake (see env below)

Env: PORT (8787), DEMO_MODE=0 to disable demo friends, ALLOW_TAMPER_DEMO=1 for the tamper demo,
DATA_FILE, ENGINE=snowflake, LLM=snowflake, SNOWFLAKE_ACCOUNT / _USER / _PASSWORD
(optional _WAREHOUSE FC_WH, _DATABASE FOURCORNERS, _SCHEMA APP, _ROLE). Run snowflake/01_setup.sql first.

## Endpoints
| Method | Path | What |
|---|---|---|
| GET | /api/health, /api/cities | status, city list |
| POST | /api/groups | create group + creator (name, describe, city, vibe) |
| POST | /api/groups/:code/join | join with an invite code |
| GET | /api/groups/:code | group, members, characters, stage, weekends to pick from |
| POST | /api/groups/:code/demo-friends | add the seeded cast (body {"fillMine":true} fills your weekends too) |
| POST | /api/groups/:code/availability | free weekends + max travel hours (token) |
| GET | /api/groups/:code/scout?nights=2 | Scout the Route: ranked weekend + city plans |
| GET | /api/groups/:code/odds?city=&weekend=&nights= | Summit Odds + smaller plans that score higher |
| POST | /api/groups/:code/pact | Plant the Flag (co-signed on Solana) |
| GET | /api/groups/:code/pact/verify | recompute fingerprint, check chain |
| POST | /api/groups/:code/stamp | Summit Stamp, streak +1 |
| GET | /api/groups/:code/nudges | countdown and prompts (?today=YYYY-MM-DD to time travel in demos) |
| GET/POST | /api/groups/:code/feed | Base Camp feed |
| POST | /api/groups/:code/debug/tamper | demo only: changes stored pact data so verify fails |

Identity: join/create returns a secret `token`; send it as header `x-member-token`.
