# Rocketed

Fast-paced, gamified crypto perps trading — a landing page and interactive
demo built with Next.js, TypeScript, and Tailwind CSS v4.

## Features

- **Perps betting** — pick an asset (BTC/ETH/SOL), a direction (up, down, or
  both at once), a target, a barrier, and leverage, then watch the position
  track live against real market prices.
- **Funded accounts** — deposit a small entry fee to unlock a much larger
  funded balance, hit a profit target before a max drawdown, and unlock a
  cash reward. Wired directly to the same balance the trading panel uses.

This build uses mock funds and a mock wallet connection — no real money or
on-chain transactions are involved. Live prices are pulled from the public
CoinGecko API.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/context/TradingContext.tsx` — shared state: wallet balance, positions,
  funded challenge, and the live price feed.
- `src/lib/types.ts` — shared types and the funded account tiers.
- `src/lib/coingecko.ts` — price data fetching.
- `src/components/` — UI: wallet menu, bet builder, price chart, positions
  list, funded packages.

See [DOCUMENTATION.md](./DOCUMENTATION.md) for the full build log —
architecture decisions, what went right, what went wrong, and the roadmap.
