# Round-Up

A concept dashboard for **Toyota Financial Services**. It rounds everyday purchases up to the next dollar and puts the spare change toward the **principal** of the customer's car loan, then shows the months and interest saved.

*Concept for Toyota Financial Services. Not an official Toyota app. All data is synthetic.*

## Run it

```bash
(cd backend && npm install) && (cd web && npm install)
(cd backend && npm start)      # API on :4000
(cd web && npm run dev)        # open http://localhost:3000
```

It runs with no keys at all (fallback mode). To use your own services, copy `backend/.env.example` to `backend/.env` and fill it in, then run `npm run snowflake:setup` and `npm run snowflake:check` in `backend/`.

Tests: `cd backend && npm test`. Web build: `cd web && npm run build`.

## What uses what

| Piece | Real (keys set) | Fallback (no keys) |
|---|---|---|
| Transactions | TigerData hypertable `transactions` + continuous aggregate `roundups_daily` | In-memory seed data |
| Customer, loan, hardship requests | Snowflake `CUSTOMERS`, `LOANS`, `HARDSHIP_REQUESTS` | Local seed; requests kept in memory |
| Explanations | `SNOWFLAKE.CORTEX.COMPLETE`, accepted only if every number was in the facts we sent | Built-in template |

`GET /api/health` reports which mode is active. The footer of the page shows it too.

## Rules the code follows

- All money math is in `backend/src/loan.ts` (tested). The AI only rewords numbers; the frontend only shows what the API returns.
- A Cortex reply with any number not in the facts is thrown away and the template is shown, labeled "Standard explanation".
- Hardship actions are requests: "Request sent. A TFS specialist will review it."
- Purchases, the customer and the loan are synthetic (Alex Rivera, 2024 RAV4 Hybrid, $28,000, 5.9% APR, 48 months).
- Modeling note: weekly extra money is spread across each month (52/12 weeks) and applied to principal; interest is charged monthly.

## Environment variables

All are listed in `backend/.env.example`: `DATABASE_URL`, `PGSSL`, `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD` or `SNOWFLAKE_PRIVATE_KEY_PATH` (+ `SNOWFLAKE_PRIVATE_KEY_PASSPHRASE`), `SNOWFLAKE_WAREHOUSE`, `SNOWFLAKE_DATABASE`, `SNOWFLAKE_SCHEMA`, `SNOWFLAKE_ROLE`, `SNOWFLAKE_CORTEX_MODEL`, `PORT`. The web app uses `BACKEND_URL` (default `http://localhost:4000`).

If `snowflake:check` says your region lacks the Cortex model, set `SNOWFLAKE_CORTEX_MODEL` to one it offers, or run as ACCOUNTADMIN: `ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';`

## 2-minute demo script

1. **Header (10s):** Alex's RAV4 loan. Point at the "Demo data" label.
2. **Your round-ups (20s):** 12 weeks of weekly bars from TigerData and the total rounded up.
3. **Live feed (25s):** press Start demo; a purchase lands every 3 seconds, each with its round-up. Mention the continuous aggregate behind the chart.
4. **What if (35s):** the slider starts at Alex's real average. Drag it up and watch the curves, months saved, interest saved and payoff date change. Round-ups go to principal.
5. **Ask (20s):** click the three questions. Note the source label (Snowflake Cortex, or Standard if it fell back) and that every number is checked.
6. **Money is tight? (10s):** show the bi-weekly effect, send a request, and read the confirmation. It is saved to Snowflake as a pending request.
