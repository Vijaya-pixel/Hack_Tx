Build the frontend for this repo's Toyota "next move" project. The backend is done; do not change anything in `backend/`, `solana/` or `design/` (ignore `design/`, it is an old prototype).

## What the product is
NextMove helps a Toyota customer answer: "Given my situation today, what's the smartest next move for me and my Toyota?" It shows realistic options with payments, costs, assumptions and trade-offs in plain language, recommends one, and ends in a single clear next step. It is for the Toyota Financial Services hackathon challenge, judged on: Personalize, Simplify, Guide, Value, plus "innovate responsibly with AI" and "prove it with synthetic data".

## Hard rules
1. Never calculate money in the frontend. Every dollar figure, mile count and percentage comes from the API. Only format numbers (round to whole dollars, add commas and $). Do not add, subtract or derive figures.
2. All customers are synthetic. Show a small, always-visible note: "Demo with synthetic customers. Estimates, not an offer."
3. Show the assumptions that come with each advice (collapsible, but present).
4. Label where the explanation came from: if `source` is `model`, show "Written by Gemini, every number checked against the calculation". If `template`, show "Standard explanation". Never hide a fallback.
5. Do not use Toyota logos, wordmarks or brand imagery, and do not imply this is an official Toyota product. Use the product name "NextMove".

## Stack
- Create `frontend/` with Vite + React + TypeScript (strict). Plain CSS or CSS modules. No UI kit.
- Charts: hand-written SVG is preferred; a small chart library is acceptable if it stays simple.
- Vite dev server proxies `/api` to `http://localhost:8787` (the backend: `cd backend && npm start`).
- Scripts: `npm run dev`, `npm run build`, `npm run typecheck`.

## API (all GET, JSON; errors are `{ "error": "..." }` with status 400/404/500)
- `/api/health` -> `{ ok, database: "connected"|"not configured"|"error", chain, llm: "gemini"|"none" }`
- `/api/customers` -> list of `{ id, name, situation, headline, story, vehicle: { model, year, msrp, mpg }, kind: "loan"|"lease", milesNow, monthlyIncome, monthlyPayment }`. The five ids: maya, jake, sam, priya, lena.
- `/api/customers/:id/advice` -> `{ customerId, today, facts: { ...numbers and a few strings }, options: [{ id, label, upfront, monthly, months, extraCost, fuelPerMonth, tradeoff }], recommendedId, reason, nextStep: { label, kind: "self-service"|"follow-up"|"offer" }, assumptions: string[], valueNote }`. `monthly` and `upfront` can have decimals: round for display. `months`, `extraCost`, `fuelPerMonth` can be null.
- `/api/customers/:id/timeline` -> `{ points: [{ month: "YYYY-MM", value, owed, equity, miles }], nowMonth, nowIndex, endMonth, crossoverMonth: string|null, crossedAlready, owedLabel }`. `owedLabel` is "Loan balance" or "Buyout price".
- `/api/customers/:id/explain` -> `{ text, source: "model"|"template", rejected?: string[], reason?: string }`
- `/api/customers/:id/pace` -> `{ average, recent, windowDays, weeks: [{ bucket: "YYYY-MM-DD", miles }], source: "tigerdata"|"in-memory", synthetic: true, note? }`
- Query options for advice, timeline and explain: `extraMiles` (-2000..3000 a month), `extraPayment` (0..2000), `pace` ("average" or "recent"). Keep the three calls in sync: when a control changes, refetch all three with the same query.

Example (Maya): facts include `overMiles: 6000, returnFees: 1895, currentPayment: 403, equity: -1851, paceBasis: "lifetime average"`; recommendedId `replace-rav4-hybrid`; nextStep "See my RAV4 Hybrid offer" (offer). With `pace=recent` her pace becomes about 1,993 miles a month and fees rise to about $2,515.

## Screens
1. **Pick a customer.** Five cards: name, vehicle (year and model), loan or lease, monthly payment, and the one-line headline. A short line at the top explains the product in one sentence.
2. **Customer view** (the main screen), top to bottom:
   - Header: name, vehicle, loan or lease, current monthly payment, back to customers.
   - **Recommendation** (the visual focus): the recommended option's label, the `reason`, its trade-off, and one prominent button with `nextStep.label`. Clicking it shows a confirmation like "Request sent (demo)". Use different button styling for offer, follow-up and self-service.
   - **Explanation** panel with the text and its source label (rule 4).
   - **Your options**: every option side by side (cards on desktop, stacked on mobile): up-front cost, monthly payment, number of months, trade-off sentence. Mark the recommended one.
   - **Timeline chart**: estimated value and amount owed (use `owedLabel`) by month, a "today" marker at `nowIndex`, the end of contract at `endMonth`, and the crossover month if any ("Your car is worth more than you owe from <month>", or "Not before the end of your contract" when null).
   - **What if** controls: "I'll drive more or less" (extraMiles slider), "Pay extra each month" (extraPayment slider, loans only), and for leases a toggle "Use my last 8 weeks of driving" (`pace=recent`). Debounce about 250 ms, keep showing the previous data while loading, and show which basis is in use (`facts.paceBasis`).
   - **Driving pace** mini chart from `/pace`: weekly miles, with average and recent pace numbers. Note "synthetic readings" and the source (TigerData or in-memory).
   - **Assumptions** (collapsible) and the `valueNote` styled as "Why this helps Toyota", visually quieter than the customer content.
3. **States:** loading skeletons, an error banner with the API's message and a Retry button, and an offline message if `/api/health` fails ("Can't reach the NextMove server. Start the backend with `cd backend && npm start`.").

## Design
- Premium, calm, trustworthy finance product; not playful or childish. Generous whitespace, one accent color for the primary action, a neutral palette otherwise. Strong typographic hierarchy; large clear numbers with tabular figures.
- Make the recommendation the one memorable element; keep everything else quiet.
- Plain, friendly copy in sentence case. Buttons say what they do.
- Responsive down to 375 px. Visible keyboard focus. Respect reduced motion. WCAG AA contrast. Never use color alone to carry meaning (add text or icons).

## Done means
- `npm run typecheck` and `npm run build` pass.
- With the backend running, all five customers load; every option, chart and control works; the sliders change the numbers that come back; the pace toggle changes Maya's fees.
- Check each customer's screen in a browser at desktop and mobile widths and fix layout issues you find.
- Add `frontend/README.md` with how to run it.
