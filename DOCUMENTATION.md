# Rocketed — Build Documentation

Living log of what this project is, how it's built, what worked, what
didn't, and why. Written to double as source material for the school /
business presentation deck.

## Build 06 — full theme reversal: white, rounded, four colors only

A deliberate reversal of the original visual brief: white background,
rounded corners everywhere, and a hard rule that only black, white,
green, and red may appear anywhere on the site.

**How the rounding flip actually works.** Build 01 enforced square
corners with `* { border-radius: 0 !important; }`. Build 06 flips that
same lever — `* { border-radius: 14px; }`, with the `!important`
dropped — so every element is rounded by default with zero
per-component changes, while still letting a specific element opt out
with an explicit Tailwind class if it ever needs to (nothing currently
does). The wallet's connection-status dot got an explicit `rounded-full`
so it renders as a circle instead of a rounded square.

**How the four-color rule actually works.** Every component already
routed its colors through CSS variables (`--brand`, `--up`, `--down`,
`--line`, `--fg`, `--bg`) rather than hardcoded hex — a payoff from
Build 01's token-based design system. Retheming was mostly just
rewriting the token values in `globals.css`: `--brand` (previously a
lime accent) became pure black, `--up`/`--down` became a solid green
and red, everything else became black, white, or a translucent black
tint for secondary text and subtle fills (a *tint* of black, not a new
hue). Nearly every component picked up the new palette automatically
through the existing `bg-brand`, `text-up`, `border-line` classes —
only a couple of files had actual hardcoded hex values
(`PriceChart.tsx`'s chart line colors) that needed direct edits.

**Two real bugs the token flip exposed.** Flattening the palette to
mostly black surfaced two contrast bugs that a dark theme's variety of
grays had been masking:
1. Several `hover:border-fg` / `hover:border-brand` states were meant
   to visibly darken a border on hover — harmless when the resting
   border was a mid-gray, but once the resting border (`--line`) and
   the hover target were *both* pure black, the hover effect became
   invisible. Fixed by routing interactive hover/focus states through
   green (`hover:border-up`) instead — now every hover/focus cue in
   the app is a real, visible color change, and green picked up a
   consistent second meaning: "interactive," not just "positive."
2. Two disabled-button states (`disabled:bg-line disabled:text-fg-dim`
   — the funded-tier "Start challenge" button and the custom bet's
   submit button) rendered as solid black with a translucent-black
   label on top of it: invisible text. Fixed by giving disabled
   buttons a light tinted fill instead of a black one.

Both were caught by actually looking at rendered screenshots at every
state (hover, disabled, selected) rather than assuming a global
token-variable swap would be visually safe everywhere it was used —
worth remembering for the presentation as a second example (after
Build 04's double-debit bug) of a bug that only shows up when you
verify the real, rendered thing.

## Build 05 — System 1: pooled, crowd-priced betting (Pools tab)

Everything through Build 04 is "System 2": you bet against the
platform, and the platform prices the odds with real math. This build
adds the other half of the original pitch — "System 1", a pooled /
parimutuel mode where there's no house and no pricing engine at all.
The crowd's own stakes set the odds.

**How a round works** (`src/context/PoolContext.tsx`): every ~35
seconds, BTC gets carved into 5 price bands sized off realized
volatility (`generateBandEdges` in the new `lib/pools.ts` — reusing
`realizedSigmaPct` from `lib/pricing.ts`, but for a completely
different purpose: System 2 uses volatility to price fair odds against
a house edge, System 1 only uses it to size the bands sensibly).
Staking is open for 25s, locks for 5s while price keeps moving, then
resolves: whichever band the price actually lands in wins, and that
band's stakers split the entire pool (all bands combined) minus a flat
5% platform fee, in proportion to their stake. A new round starts
immediately after a 6-second results window.

**Simulated crowd, real math.** There's no multiplayer backend in this
build, so 6–14 bot stakes are scheduled at random times and random
amounts each round, weighted toward the middle bands the way a real
crowd would cluster (`weightedRandomBand`). This is scoped and
documented deliberately, the same way the wallet-connect mockup and
price-feed jitter were in earlier builds — the *pool accounting, fee,
and live odds are real arithmetic*, only the other participants are
synthetic for the demo.

**Shared account, on purpose.** Staking a pool debits/credits through
the exact same `debitActiveBalance` / `creditActiveBalance` functions
System 2 and funded challenges use. A funded challenge active on the
Trade tab is the same balance a Pool stake draws from. This is the
"one account, two systems" pitch made literal: prediction markets
(Polymarket etc.) have nailed the pooled/social mode, and solo barrier
betting against real pricing is a much less crowded space — bundling
both under one identity is a different product than either alone.

**Scoped to BTC only for this build** — running multiple simultaneous
per-asset rounds is a straightforward extension (the round state is
already asset-agnostic in shape) but added UI complexity that wasn't
worth it for a first pass.

## Build 04 — full manual pricing, decay, and a real accounting bug

Feedback after build 03: three risk presets weren't "full control" —
the request was to type in the actual prices being bet on, exactly
like the original pitch ("$100 that it hits 66k before it drops below
65k"). Plus two new rules to keep the game honest: payout should decay
the longer a bet sits open, and cashing out early shouldn't be a way
to bank a profit that hasn't actually happened yet.

**Custom prices, typed by hand.** `BetBuilder` now has a Quick/Custom
toggle. Custom mode is two plain number inputs — the target price and
the barrier price — with direction inferred automatically from which
one sits above the current price and which sits below (no separate
up/down picker needed). `TradingContext.previewCustomBet` and
`placeCustomBet` reuse the exact same `priceBarrier` pricing core a
preset quote uses (pulled out of `quoteBet` in `lib/pricing.ts`
specifically so both paths share one source of truth), so a typed bet
gets the same fair, house-edged odds a preset does. The barrier is
capped at $1,000 from the live price — otherwise someone could type a
barrier so far away the bet is effectively risk-free, which breaks the
whole pricing model's premise.

**Payout decays while a position sits open.** `decayedPayoutMultiplier`
halves the *profit portion* of the locked-in payout every 45 seconds
(floored so it never fully disappears), based on how long the position
has been open when it actually hits. `PositionsList` shows this live
for every open position — "if it hits now: 1.91x" ticking down in real
time — which is a direct, honest incentive against just parking a bet
and walking away.

**Cash-out capped at zero.** The whole point of leverage was supposed
to be the cash-out-now value (Build 03), but nothing stopped someone
from cashing out *into a profit* the moment price moved slightly in
their favor — defeating "you have to actually hit the target to profit."
Fixed by capping both the displayed floating value and the real
`cashOut()` payout at a maximum of 0: cashing out can return your stake
or realize a partial loss, never a gain.

**A real bug, caught by testing the exact numbers.** While verifying
the above, a $25 bet debited $50 from the wallet. Cause:
`debitActiveBalance`/`creditActiveBalance` called `setWalletBalance`
*inside* a `setChallenge` updater function. React can invoke an
updater function more than once per commit in Strict Mode specifically
to catch impure updaters — and since the nested `setWalletBalance` call
was a side effect of that updater, it fired twice too. Fixed by reading
the active challenge from a ref synchronously and dispatching exactly
one `setState` call per function, instead of nesting one inside
another's updater. Worth calling out in the presentation: this is
exactly the class of bug that "it worked when I tried it" doesn't
catch, and a scripted browser test that checks exact dollar amounts
(not just "no console errors") did.

## Build 03 — real odds pricing, and what leverage is actually for

Feedback after build 02: the fixed 1.3x/1.8x/2.6x payouts weren't
actually priced off anything, and leverage didn't do anything a user
could feel — it only scaled a floating number nobody could act on.
Two changes, both in a new `src/lib/pricing.ts` module.

**1. Bets are now priced with real first-passage probability.**
Every preset is now defined as a *multiple of realized volatility*
(`targetVolMult` / `barrierVolMult` in `lib/types.ts`) rather than a
fixed percent. `TradingContext` keeps a rolling window of live prices
per asset and computes realized volatility from it
(`realizedSigmaPct`) — actual stdev of log returns, scaled to a
5-minute horizon, not a static assumption. That volatility sets how
far away the target and barrier actually are for the chosen risk
level, so "Bold" means something different in a calm market than a
volatile one.

The payout itself comes from the classic gambler's-ruin result:
treating log-price as a driftless martingale, the probability of
hitting one boundary before another depends only on log-distance to
each one (`firstPassageWinProb`). Fair odds are `1 / probability`; the
platform takes a flat 5% edge off that. A safer bet (wide barrier,
close target) has high win probability and a low payout; a bolder bet
is the reverse — and the number is computed live and shown before you
ever tap a bet, not hardcoded per preset.

**2. Leverage got an actual job: cashing out early.**
The fixed multiplier above is *only* what you get if the bet plays out
to target or barrier. It was never what leverage should have been
pricing. Leverage now exclusively scales the **cash-out-now** value —
the position's floating pnl while it's still open
(`amount * % moved toward target * leverage`, capped at losing the
stake). `TradingContext.cashOut()` locks that value in immediately
instead of waiting for target/barrier, and it settles through the
exact same settlement path a win or knockout does — so it plays fair
with an active funded challenge too. This is the resolution to a
question that came up mid-build: fixed-outcome payout is a *probability*
question, cash-out value is a *how far has it actually moved* question,
and conflating them under one "leverage" slider was the original bug.

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

> **Superseded in Build 06:** the square-corners/dark-only rules above
> were the original brief for build 01. Build 06 deliberately reversed
> the first two — see below — while keeping the same underlying
> discipline (one global rule instead of trusting every component to
> remember). The "top-left = wallet" rule is unchanged.

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
- The pricing model (`lib/pricing.ts`) assumes zero drift and treats
  the live tick feed's own jitter as part of "realized volatility" —
  honest for a demo, but a real version would separate true market
  volatility from the animation layer described in Build 01 §5, and
  likely add a bounded time horizon so volatility affects win
  probability directly, not just where the barriers get placed.
- Single funded challenge at a time (no history of past challenge
  attempts).

## 9. Suggested next steps

1. Real wallet connect (wagmi + RainbowKit) behind the existing
   `WalletMenu` UI — the dropdown shape shouldn't need to change.
2. Give bets a bounded round length (e.g. 30s/2min/10min) so the
   pricing model can use finite-horizon first-passage probability
   instead of the current infinite-horizon assumption.
3. Persist state (positions, challenge, balance) so it survives a
   refresh — likely a small backend or even just `localStorage` first.
4. Replace the hand-rolled SVG chart with a real candlestick chart
   once we need more than a directional sparkline.
