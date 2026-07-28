"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchSpotPrices } from "@/lib/coingecko";
import {
  decayedPayoutMultiplier,
  MAX_CUSTOM_BARRIER_DISTANCE,
  priceBarrier,
  Quote,
  quoteBet,
  realizedSigmaPct,
} from "@/lib/pricing";
import {
  ActiveChallenge,
  AssetId,
  BET_PRESETS,
  Direction,
  FUNDED_TIERS,
  Position,
  PositionStatus,
} from "@/lib/types";

const STARTING_BALANCE = 10000;
const REAL_PRICE_POLL_MS = 15000;
const TICK_MS = 1000;
const JITTER_VOL = 0.0006; // per-tick volatility used to animate price between real fetches
const HISTORY_LIMIT = 400;

interface PlaceBetArgs {
  asset: AssetId;
  direction: Direction;
  amount: number;
  presetId: string;
}

interface PlaceCustomBetArgs {
  asset: AssetId;
  amount: number;
  targetPrice: number;
  barrierPrice: number;
  leverage: number;
}

export interface CustomPreview {
  side: "up" | "down";
  entryPrice: number;
  winProbability: number;
  payoutMultiplier: number;
}

interface TradingState {
  connected: boolean;
  walletBalance: number;
  prices: Record<AssetId, number>;
  priceReady: boolean;
  positions: Position[];
  challenge: ActiveChallenge | null;
  connect: () => void;
  disconnect: () => void;
  deposit: (amount: number) => void;
  /** Debits whichever balance is currently active (funded challenge, else
   * the demo wallet). Shared by every feature that takes a stake. */
  debitActiveBalance: (amount: number) => void;
  /** Credits whichever balance is currently active, and re-checks the
   * active challenge's pass/fail thresholds. Shared by every feature that
   * pays out -- perps positions, cash-outs, and pool payouts alike. */
  creditActiveBalance: (amount: number) => void;
  getQuote: (asset: AssetId, side: "up" | "down", presetId: string) => Quote | null;
  placeBet: (args: PlaceBetArgs) => Position[] | null;
  /** Live odds preview for a fully custom, typed-in target/barrier price
   * pair -- null while the two prices don't straddle the current price. */
  previewCustomBet: (asset: AssetId, targetPrice: number, barrierPrice: number) => CustomPreview | null;
  placeCustomBet: (args: PlaceCustomBetArgs) => Position[] | null;
  cashOut: (positionId: string) => void;
  startChallenge: (tierId: string) => void;
  resetChallenge: () => void;
}

const TradingContext = createContext<TradingState | null>(null);

function resolvePosition(pos: Position, price: number): Position {
  if (pos.status !== "open") return pos;

  const hitTarget =
    pos.side === "up" ? price >= pos.targetPrice : price <= pos.targetPrice;
  const hitBarrier =
    pos.side === "up" ? price <= pos.barrierPrice : price >= pos.barrierPrice;

  let status: PositionStatus = pos.status;
  let pnl = pos.pnl;

  if (hitBarrier) {
    status = "knocked_out";
    pnl = -pos.amount;
  } else if (hitTarget) {
    status = "won";
    const effectiveMultiplier = decayedPayoutMultiplier(
      pos.payoutMultiplier,
      Date.now() - pos.openedAt
    );
    pnl = pos.amount * effectiveMultiplier;
  } else {
    // Cash-out-now value: this is what leverage actually drives -- how hard
    // the exit-early value swings per % moved, independent of the fixed
    // target/barrier payout locked in at open time. Capped at 0: cashing
    // out can only ever return your stake, never a profit -- only actually
    // hitting the target does that.
    const move = (price - pos.entryPrice) / pos.entryPrice;
    const directional = pos.side === "up" ? move : -move;
    pnl = pos.amount * directional * pos.leverage;
    pnl = Math.max(pnl, -pos.amount);
    pnl = Math.min(pnl, 0);
  }

  return { ...pos, status, pnl, closedAt: status !== "open" ? Date.now() : undefined, closePrice: status !== "open" ? price : undefined };
}

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState(STARTING_BALANCE);
  const [anchorPrices, setAnchorPrices] = useState<Record<AssetId, number> | null>(null);
  const [prices, setPrices] = useState<Record<AssetId, number> | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);

  const pricesRef = useRef(prices);
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  const challengeRef = useRef(challenge);
  useEffect(() => {
    challengeRef.current = challenge;
  }, [challenge]);

  // Rolling per-asset price window used to price bets off realized
  // volatility instead of a static assumption. Kept in a ref (not state) --
  // it's read synchronously by pricing, never rendered directly.
  const historyRef = useRef<Partial<Record<AssetId, number[]>>>({});

  // Poll real prices from CoinGecko; this is the "ground truth" anchor.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const spot = await fetchSpotPrices();
        if (cancelled) return;
        setAnchorPrices(spot);
        setPrices((prev) => prev ?? spot);
      } catch {
        // API hiccup: keep animating off the last known anchor instead of freezing the UI.
      }
    }
    poll();
    const id = setInterval(poll, REAL_PRICE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Animate a fast, gamified tick between real fetches: a random walk that
  // mean-reverts toward the last real anchor price so it never drifts away
  // from reality, then resolve any open positions against the new tick.
  useEffect(() => {
    const id = setInterval(() => {
      setPrices((prev) => {
        if (!prev || !anchorPrices) return prev;
        const next = { ...prev };
        (Object.keys(prev) as AssetId[]).forEach((asset) => {
          const anchor = anchorPrices[asset];
          const current = prev[asset];
          const reversion = (anchor - current) * 0.08;
          const noise = current * JITTER_VOL * (Math.random() * 2 - 1);
          next[asset] = Math.max(0.01, current + reversion + noise);

          const hist = historyRef.current[asset] ?? [];
          hist.push(next[asset]);
          if (hist.length > HISTORY_LIMIT) hist.shift();
          historyRef.current[asset] = hist;
        });

        setPositions((posPrev) =>
          posPrev.map((p) => resolvePosition(p, next[p.asset]))
        );

        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [anchorPrices]);

  const connect = useCallback(() => setConnected(true), []);
  const disconnect = useCallback(() => setConnected(false), []);
  const deposit = useCallback((amount: number) => {
    setWalletBalance((b) => b + amount);
  }, []);

  // These read challengeRef (not the `challenge` state variable) and each
  // call exactly one setState. Nesting a setWalletBalance call inside a
  // setChallenge updater looks convenient, but React (in Strict Mode, at
  // least) can invoke an updater function more than once per commit -- and
  // since that side effect would then fire more than once too, a single
  // bet was silently getting debited twice. Reading a ref synchronously and
  // dispatching one clean update avoids the whole class of bug.
  const debitActiveBalance = useCallback((amount: number) => {
    const active = challengeRef.current;
    if (active && active.status === "active") {
      setChallenge((prev) => (prev ? { ...prev, balance: prev.balance - amount } : prev));
    } else {
      setWalletBalance((b) => b - amount);
    }
  }, []);

  const creditActiveBalance = useCallback((amount: number) => {
    const active = challengeRef.current;
    if (active && active.status === "active") {
      setChallenge((prev) => {
        if (!prev) return prev;
        const newBalance = prev.balance + amount;
        const tier = FUNDED_TIERS.find((t) => t.id === prev.tierId)!;
        const profit = newBalance - tier.fundSize;
        let status: ActiveChallenge["status"] = "active";
        if (profit >= tier.profitTarget) status = "passed";
        else if (profit <= -tier.maxDrawdown) status = "failed";
        return { ...prev, balance: newBalance, status };
      });
    } else {
      setWalletBalance((b) => b + amount);
    }
  }, []);

  // Whenever positions close, settle their pnl into either the demo wallet
  // or the active funded challenge balance -- this is the link between the
  // trading panel and the funded-account feature.
  const settledIds = useRef(new Set<string>());
  useEffect(() => {
    positions.forEach((p) => {
      if (p.status === "open" || settledIds.current.has(p.id)) return;
      settledIds.current.add(p.id);
      creditActiveBalance(p.pnl);
    });
  }, [positions, creditActiveBalance]);

  const getQuote = useCallback(
    (asset: AssetId, side: "up" | "down", presetId: string): Quote | null => {
      const price = pricesRef.current?.[asset];
      const preset = BET_PRESETS.find((p) => p.id === presetId);
      if (!price || !preset) return null;
      const sigmaPct = realizedSigmaPct(historyRef.current[asset] ?? []);
      return quoteBet(price, side, preset, sigmaPct);
    },
    []
  );

  const placeBet = useCallback((args: PlaceBetArgs) => {
    const price = pricesRef.current?.[args.asset];
    const preset = BET_PRESETS.find((p) => p.id === args.presetId);
    if (!price || !preset) return null;

    const sides: ("up" | "down")[] =
      args.direction === "both" ? ["up", "down"] : [args.direction];

    const perSideAmount =
      args.direction === "both" ? args.amount / 2 : args.amount;

    const newPositions: Position[] = sides.map((side) => {
      const quote = getQuote(args.asset, side, args.presetId)!;

      return {
        id: `${Date.now()}-${side}-${Math.random().toString(36).slice(2, 8)}`,
        asset: args.asset,
        side,
        presetId: args.presetId,
        amount: perSideAmount,
        leverage: preset.leverage,
        entryPrice: price,
        targetPrice: quote.targetPrice,
        barrierPrice: quote.barrierPrice,
        payoutMultiplier: quote.payoutMultiplier,
        winProbability: quote.winProbability,
        openedAt: Date.now(),
        status: "open",
        pnl: 0,
      };
    });

    debitActiveBalance(args.amount);
    setPositions((prev) => [...newPositions, ...prev]);
    return newPositions;
  }, [getQuote, debitActiveBalance]);

  // A custom bet has no preset at all: the user types the exact target and
  // barrier prices, direction is inferred from which side of the current
  // price each one falls on, and odds come straight out of the same
  // gambler's-ruin pricing core a preset quote uses.
  const previewCustomBet = useCallback(
    (asset: AssetId, targetPrice: number, barrierPrice: number): CustomPreview | null => {
      const price = pricesRef.current?.[asset];
      if (!price || !targetPrice || !barrierPrice) return null;
      const targetAbove = targetPrice > price;
      const barrierAbove = barrierPrice > price;
      if (targetAbove === barrierAbove) return null; // must straddle the current price
      if (Math.abs(barrierPrice - price) > MAX_CUSTOM_BARRIER_DISTANCE) return null;

      const side: "up" | "down" = targetAbove ? "up" : "down";
      const { winProbability, payoutMultiplier } = priceBarrier(price, targetPrice, barrierPrice);
      return { side, entryPrice: price, winProbability, payoutMultiplier };
    },
    []
  );

  const placeCustomBet = useCallback((args: PlaceCustomBetArgs) => {
    const preview = previewCustomBet(args.asset, args.targetPrice, args.barrierPrice);
    if (!preview) return null;

    const position: Position = {
      id: `${Date.now()}-custom-${Math.random().toString(36).slice(2, 8)}`,
      asset: args.asset,
      side: preview.side,
      presetId: "custom",
      amount: args.amount,
      leverage: args.leverage,
      entryPrice: preview.entryPrice,
      targetPrice: args.targetPrice,
      barrierPrice: args.barrierPrice,
      payoutMultiplier: preview.payoutMultiplier,
      winProbability: preview.winProbability,
      openedAt: Date.now(),
      status: "open",
      pnl: 0,
    };

    debitActiveBalance(args.amount);
    setPositions((prev) => [position, ...prev]);
    return [position];
  }, [previewCustomBet, debitActiveBalance]);

  const cashOut = useCallback((positionId: string) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== positionId || p.status !== "open") return p;
        const price = pricesRef.current?.[p.asset];
        if (!price) return p;
        const move = (price - p.entryPrice) / p.entryPrice;
        const directional = p.side === "up" ? move : -move;
        let pnl = Math.max(p.amount * directional * p.leverage, -p.amount);
        pnl = Math.min(pnl, 0);
        return {
          ...p,
          status: "cashed_out",
          pnl,
          closedAt: Date.now(),
          closePrice: price,
        };
      })
    );
  }, []);

  const startChallenge = useCallback((tierId: string) => {
    const tier = FUNDED_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    setWalletBalance((b) => b - tier.depositCost);
    setChallenge({
      tierId,
      startedAt: Date.now(),
      balance: tier.fundSize,
      status: "active",
    });
  }, []);

  const resetChallenge = useCallback(() => setChallenge(null), []);

  return (
    <TradingContext.Provider
      value={{
        connected,
        walletBalance,
        prices: prices ?? ({} as Record<AssetId, number>),
        priceReady: !!prices,
        positions,
        challenge,
        connect,
        disconnect,
        deposit,
        debitActiveBalance,
        creditActiveBalance,
        getQuote,
        placeBet,
        previewCustomBet,
        placeCustomBet,
        cashOut,
        startChallenge,
        resetChallenge,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}
