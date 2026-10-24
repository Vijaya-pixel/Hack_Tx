# Four Corners: Solana scripts (devnet, play money)

Needs Node 18+. Run from this folder.

    npm install
    npm run selftest     # offline check, should print "All offline checks passed"
    npm run wallets      # makes 4 test wallets (Arlo, Beck, Cyrus, Dante)
    npm run airdrop      # free devnet SOL for Arlo (pays the tiny fees)
    npm run pact         # Plant the Flag: all four sign the trip pact
    npm run verify       # confirms fingerprint + all four signatures on-chain
    npm run stamp        # Summit Stamp after the trip (streak goes up)

Custom pact:  node pact.mjs --city Denver --weekend 2026-12-05

If the airdrop is rate limited: go to https://faucet.solana.com, pick Devnet,
paste Arlo's address (printed by the airdrop script).

Only SHA-256 fingerprints go on-chain. wallets.json holds test keys: never use for real money.
