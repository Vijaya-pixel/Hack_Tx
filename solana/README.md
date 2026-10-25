# Solana helpers (devnet, play money)

Reusable pieces for writing a short fingerprint to Solana with one or more signers.
Run from this folder. Needs Node 18+.

    npm install
    npm run selftest     # offline check, should print "All offline checks passed"
    npm run typecheck
    npm run wallets      # makes test wallets (wallets.json, git-ignored)
    npm run airdrop      # free devnet SOL for the first wallet (it pays the tiny fees)

What `lib.ts` gives you: `fingerprint()` (stable SHA-256 of any JSON), `sendCoSigned()` (a memo
transaction that every wallet must sign), `checkMemoOnChain()` (re-reads it and checks the text and signers),
and `saveReceipt()` / `loadReceipts()`. The backend's `chain.ts` wraps these.

If the airdrop is rate limited, open https://faucet.solana.com, pick Devnet, and paste the address it prints.
Only fingerprints go on-chain. `wallets.json` holds test keys: never use them for real money.
