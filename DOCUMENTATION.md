# Rocketed — Build Documentation

Living log of what this project is, how it's built, what worked, what
didn't, and why. Written to double as source material for the school /
business presentation deck.

## Build 02 — simpler betting, real tabs

Feedback after build 01: the bet builder read too much like a trading
form (four sliders — leverage, target %, barrier %, plus a separate
submit button), and the site was a single long scrolling page with
anchor links instead of real navigation. Two changes:

**1. Betting became one-tap, outcome-first.**
`BetBuilder.tsx` no longer exposes raw sliders by default. Instead:
amount is a row of dollar chips, risk is one of three plain-language
presets (**Safe / Balanced / Bold** — see `BET_PRESETS` in
`lib/types.ts`), and the three direction choices are themselves the
submit buttons, each stating the actual outcome in plain language —
*"Hits $64,700 first, before it drops to $62,480"* — instead of asking
the user to interpret "target distance" and "barrier distance" as
percentages. Picking an amount and a risk level, then tapping one
outcome, places the bet in one motion. A short toast confirms what was
just bet.

This also fixed something the flat 1.8x payout in build 01 got wrong:
every risk level paid the same regardless of how likely it was to hit.
`Position` now carries its own `payoutMultiplier`, set from the chosen
preset at bet time (1.3x Safe, 1.8x Balanced, 2.6x Bold), so a bolder
bet actually pays more.

**2. The site became real tabs.** Home, Trade, and Funded Accounts are
now actual routes (`src/app/page.tsx`, `src/app/trade/page.tsx`,
`src/app/funded/page.tsx`), not anchor-scrolled sections on one page.
`Navbar.tsx` reads the current route with `usePathname` and underlines
the active tab. `TradingProvider`, the navbar, and the footer all moved
up into `layout.tsx` so every tab shares one wallet/balance/position
state without re-mounting it per page — the Home page is now just a
pitch with links into the other two tabs.

## 1. What this is

Rocketed is a landing page + interactive demo for a **fast-paced,
gamified crypto perps trading product**. Two core features, both live
in this first build as fully interactive mockups (mock funds, mock
wallet, real live BTC/ETH/SOL prices):

1. **Perps betting** — pick an asset, a direction (up, down, or
   *both at once*), a target price, a barrier ("knockout") price, and
   leverage. The position tracks live against real market prices and
   resolves automatically: hit the target before the barrier and it
   pays out; hit the barrier first and it's knocked out.
2. **Funded accounts** — deposit a small real amount (e.g. $50) to
   unlock a much larger "funded" balance (e.g. $1,000). Trade that
   balance under a profit target / max drawdown challenge. Hit the
   target and unlock a cash reward; blow the drawdown and the
   challenge fails.

## 2. Tech stack and why

| Choice | Reasoning |
|---|---|
| Next.js 16 (App Router) + TypeScript | Room to grow into a real product later (SSR, API routes, easy Vercel deploy) without a rewrite. |
| Tailwind CSS v4 (CSS-first config) | Fast to build a strict, custom design system with; no `tailwind.config.js` needed in v4, all tokens live in `globals.css`. |
| No chart / wallet libraries yet | Kept the surface area small for build #1. Chart is a hand-rolled SVG polyline; wallet connect is a mockup. Both are natural places to swap in real libraries (`wagmi`/RainbowKit, `lightweight-charts`) later without touching surrounding logic. |
| CoinGecko public API | Free, no API key, good enough for a demo price feed. Rate-limited, which shaped the price-animation design below. |

## 3. Design constraints (from the brief)

- **Blank slate, no inherited template styling.** Deleted the default
  `create-next-app` boilerplate page entirely.
- **All boxes square — no rounded corners, anywhere.** Enforced two
  ways: (1) never using Tailwind's `rounded-*` utilities, and (2) a
  blunt global rule in `globals.css`: `* { border-radius: 0 !important; }`.
  Belt-and-suspenders — if a future component accidentally adds a
  rounded class, the global rule still wins.
- **No gradients.** Flat colors only. Also enforced globally via
  `background-image: none !important` on `*`, so a stray
  `bg-gradient-*` utility can't sneak one in either.
- **Top-left = wallet.** The brand mark and the wallet
  connect/deposit dropdown sit together in the top-left of the sticky
  nav — first thing a user's eye hits.

## 4. How the pieces connect (the part worth presenting)

The most interesting engineering decision in this build is that
**the trading panel and the funded-account challenge are not separate
features bolted together — they share one balance.**

`src/context/TradingContext.tsx` is a single React Context that holds:
- live prices (see §5),
- the list of open/closed positions,
- the demo wallet balance,
- the currently active funded challenge (if any).

When a user places a bet (`placeBet`), the cost is debited from
**whichever balance is active** — the demo wallet, or the funded
challenge balance if one is running. When a position resolves (wins,
gets knocked out, or just moves), its P&L is credited back to that
same balance. The funded-account progress bar in `FundedPackages.tsx`
is not a separate simulation — it's reading the literal outcome of
trades placed in `TradePanel.tsx`. Passing or failing a challenge
(`profitTarget` / `maxDrawdown` in `lib/types.ts`) is computed as a
side effect of that same settlement code path, in one `useEffect`.

This is the "how did component A talk to component B" story: a single
source of truth (`TradingContext`) instead of prop-drilling or
duplicated state, so the two features stay consistent without knowing
about each other's UI at all — `FundedPackages` never imports
anything from `TradePanel` or vice versa.

## 5. The piece of code I'm proud of: the price feed

Real problem: CoinGecko's free tier can't be polled every second
without getting rate-limited, but a "fast-paced" gamified trading
product needs the price to visibly move every second or it feels
dead.

Solution in `TradingContext.tsx` (two `useEffect`s working together):

1. **Anchor loop** (every 15s): fetches real spot prices from
   CoinGecko. This is ground truth.
2. **Tick loop** (every 1s): nudges the *displayed* price with a small
   random walk, but mean-reverts it 8% of the way back toward the real
   anchor on every tick (`reversion = (anchor - current) * 0.08`).

Net effect: the price feels alive every second, but it can never drift
far from the real market price between real fetches — it's always
being pulled back. This is also the same tick loop that resolves open
positions (`resolvePosition`), so "does this bet just hit its target"
is checked at the same 1Hz cadence the user sees the price move at.

## 6. What went right

- Context-based state sharing turned out to be the right call early —
  adding the funded-account feature afterward required zero changes
  to `TradingContext`'s public shape, just new consumers.
- Enforcing "no rounded corners / no gradients" at the global CSS
  layer (rather than "just remember not to use those classes") means
  the constraint can't regress as more components get added.
- `npx tsc --noEmit` passed clean on the first full pass across all
  new components — the shared `lib/types.ts` module (one file, no
  duplicated shape definitions) is most of why.

## 7. What went wrong / had to be worked around

- `create-next-app` picked up a stray `package-lock.json` in the
  parent `C:\Users\lucas` directory and warned about an ambiguous
  Turbopack workspace root. Fixed by explicitly pinning
  `turbopack.root` in `next.config.ts`.
- No `chromium-cli` available in this Windows environment for the
  usual headless-browser screenshot check; had to install Playwright
  and its Chromium binary on demand instead of using the normal
  container tooling.
- Real wallet connection (MetaMask etc.) was explicitly descoped for
  this pass — the dropdown is a mockup. Documented here so it isn't
  mistaken for a bug later: **no `wagmi`/`ethers` dependency exists
  yet.**

## 8. Known gaps / not built yet

- No backend, no persistence — refreshing the page resets all state
  (wallet balance, positions, challenge progress).
- No real payments/on-chain deposits — "Deposit" just adds to a
  client-side number.
- No user accounts/auth.
- Payout is one of three fixed multipliers (1.3x / 1.8x / 2.6x, picked
  by risk preset) rather than continuously priced — a real version
  would price it off implied probability from distance-to-barrier and
  time, like a real barrier option.
- Single funded challenge at a time (no history of past challenge
  attempts).

## 9. Suggested next steps

1. Real wallet connect (wagmi + RainbowKit) behind the existing
   `WalletMenu` UI — the dropdown shape shouldn't need to change.
2. Proper continuous options-pricing model for bet payouts instead of
   the three fixed preset multipliers.
3. Persist state (positions, challenge, balance) so it survives a
   refresh — likely a small backend or even just `localStorage` first.
4. Replace the hand-rolled SVG chart with a real candlestick chart
   once we need more than a directional sparkline.
