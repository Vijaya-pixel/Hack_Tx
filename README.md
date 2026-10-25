# RoundGear

A concept dashboard for **Toyota Financial Services**. It rounds everyday purchases up to the next dollar and puts the spare change toward the **principal** of the customer's car loan, then shows the months and interest saved.

*Concept for Toyota Financial Services. Not an official Toyota app. All data is synthetic.*

## Run it

```bash
(cd backend && npm install) && (cd web && npm install)
(cd backend && npm start)      # API on :4000
(cd web && npm run dev)        # open http://localhost:3000
```

It runs with no keys at all (fallback mode). To use your own services, copy `backend/.env.example` to `backend/.env` and fill in `DATABASE_URL` (TigerData) and/or `GEMINI_API_KEY`.

Tests: `cd backend && npm test`. Web build: `cd web && npm run build`.

## What uses what

| Piece | Real (keys set) | Fallback (no keys) |
|---|---|---|
| Transactions | TigerData hypertable `transactions` + continuous aggregate `roundups_daily` | In-memory seed data |
| Customer, loan, hardship requests | Demo seed in `backend/src/customers.ts` (requests kept in memory) | same |
| Explanations (Ask) | Google Gemini, accepted only if every number was in the facts we sent | Built-in standard text |

`GET /api/health` reports which mode is active. The footer of the page shows it too.

## Gear, the Gemini-powered agent

The **Ask** page is **Gear**, RoundGear's loan guide, an AI assistant **powered by Google Gemini**. How it works:

1. The backend's loan engine (`backend/src/loan.ts`, unit-tested) calculates every number: payment, months saved, interest saved, payoff date.
2. Those finished numbers become a short list of facts. Gear (Gemini, via `backend/src/gemini.ts`) is given only those facts and turns them into 2 to 3 plain-language sentences for one of three preset questions.
3. Every number in Gemini's reply is checked against the facts. An answer with any other number is discarded.
4. If there is no key, a network error or a rejected answer, the app shows a correct built-in "standard answer", labeled as such.

The page shows a "Powered by Google Gemini" badge only when a Gemini key is configured, and labels each answer with its source.

## Rules the code follows

- All money math is in `backend/src/loan.ts` (tested). The AI only rewords numbers; the frontend only shows what the API returns.
- A Gemini reply with any number not in the facts is thrown away and the template is shown, labeled "Standard explanation".
- Hardship actions are requests: "Request sent. A TFS specialist will review it."
- Purchases, the customer and the loan are synthetic (Vijay, 2024 Toyota GR86, $28,000, 5.9% APR, 48 months).
- Modeling note: weekly extra money is spread across each month (52/12 weeks) and applied to principal; interest is charged monthly.

## Environment variables

All are listed in `backend/.env.example`: `DATABASE_URL`, `PGSSL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`. The web app uses `BACKEND_URL` (default `http://localhost:4000`).

## 2-minute demo script

1. **Header (10s):** Vijay and the GR86 loan card. Point at the footer note that all data is synthetic.
2. **Your round-ups (20s):** 12 weeks of weekly bars from TigerData and the total rounded up.
3. **Live feed (25s):** press Start demo; a purchase lands every 3 seconds, each with its round-up. Mention the continuous aggregate behind the chart.
4. **What if (35s):** the slider starts at Vijay's real average. Drag it up and watch the curves, months saved, interest saved and payoff date change. Round-ups go to principal.
5. **Ask (20s):** click the three questions. Note the source label (Google Gemini, or Standard if it fell back) and that every number is checked.
6. **Money is tight? (10s):** show the bi-weekly effect, send a request, and read the confirmation. It shows as a pending request.
