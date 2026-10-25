# Plan (draft)

Pivoted from the friends-trip app to **NextMove**, for Toyota Financial Services' "What's Your Next Move?" challenge.
The earlier project is kept on the `four-corners-archive` branch.

## Idea
A Toyota customer sees their smartest next move (keep, buy out, trade, payment relief) with exact costs,
explained in plain English, ending in one clear next step. A staff view shows retention and savings.

## Toyota's four points
Personalize (simulated customer, vehicle, loan or lease), Simplify (options, payments, trade-offs in plain language),
Guide (one clear next step), Value (retention, revenue, less service effort).
Expectations: working prototype, synthetic data, responsible AI, new customer experience, business value.

## Principles
- Payment and cost math is done by plain code, never by an AI. An AI (if used) only explains numbers it is given.
- Every figure shows its assumptions.
- Synthetic data only.

## Built so far (branch `toyota`)
- Money engine, five synthetic customers, advice with reasons and next steps, a value-vs-owed timeline with what-if sliders, API routes, 67 tests.
- Not built yet: Gemini explanation (with a number guard), TigerData readings, Solana advice receipts, frontend.

## Possible pieces (not decided)
- TigerData for customers, vehicles, loans and payment history
- Capital One Nessie as the bank data source, with a local fallback
- Solana proof-of-advice (optional)
- Muse (Meta) only if it gets a real role

## Open questions
- Submission deadline
- Whether to use Nessie live or only in its data format
- What to do with the `design/` folder (Four Corners prototype)
