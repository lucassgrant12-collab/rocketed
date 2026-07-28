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

interface PlaceBetArgs {
  asset: AssetId;
  direction: Direction;
  amount: number;
  presetId: string;
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
  placeBet: (args: PlaceBetArgs) => Position[] | null;
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
    pnl = pos.amount * pos.payoutMultiplier;
  } else {
    const move = (price - pos.entryPrice) / pos.entryPrice;
    const directional = pos.side === "up" ? move : -move;
    pnl = pos.amount * directional * pos.leverage;
    pnl = Math.max(pnl, -pos.amount);
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
        });

        setPositions((posPrev) =>
          posPrev.map((p) => resolvePosition(p, next[p.asset]))
        );

        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [anchorPrices]);

  // Whenever positions close, settle their pnl into either the demo wallet
  // or the active funded challenge balance -- this is the link between the
  // trading panel and the funded-account feature.
  const settledIds = useRef(new Set<string>());
  useEffect(() => {
    positions.forEach((p) => {
      if (p.status === "open" || settledIds.current.has(p.id)) return;
      settledIds.current.add(p.id);

      setChallenge((prevChallenge) => {
        if (!prevChallenge || prevChallenge.status !== "active") {
          setWalletBalance((b) => b + p.pnl);
          return prevChallenge;
        }
        const newBalance = prevChallenge.balance + p.pnl;
        const tier = FUNDED_TIERS.find((t) => t.id === prevChallenge.tierId)!;
        const profit = newBalance - tier.fundSize;
        let status: ActiveChallenge["status"] = "active";
        if (profit >= tier.profitTarget) status = "passed";
        else if (profit <= -tier.maxDrawdown) status = "failed";
        return { ...prevChallenge, balance: newBalance, status };
      });
    });
  }, [positions]);

  const connect = useCallback(() => setConnected(true), []);
  const disconnect = useCallback(() => setConnected(false), []);
  const deposit = useCallback((amount: number) => {
    setWalletBalance((b) => b + amount);
  }, []);

  const placeBet = useCallback((args: PlaceBetArgs) => {
    const price = pricesRef.current?.[args.asset];
    const preset = BET_PRESETS.find((p) => p.id === args.presetId);
    if (!price || !preset) return null;

    const sides: ("up" | "down")[] =
      args.direction === "both" ? ["up", "down"] : [args.direction];

    const perSideAmount =
      args.direction === "both" ? args.amount / 2 : args.amount;

    const newPositions: Position[] = sides.map((side) => {
      const targetPrice =
        side === "up"
          ? price * (1 + preset.targetPct / 100)
          : price * (1 - preset.targetPct / 100);
      const barrierPrice =
        side === "up"
          ? price * (1 - preset.barrierPct / 100)
          : price * (1 + preset.barrierPct / 100);

      return {
        id: `${Date.now()}-${side}-${Math.random().toString(36).slice(2, 8)}`,
        asset: args.asset,
        side,
        amount: perSideAmount,
        leverage: preset.leverage,
        entryPrice: price,
        targetPrice,
        barrierPrice,
        payoutMultiplier: preset.payoutMultiplier,
        openedAt: Date.now(),
        status: "open",
        pnl: 0,
      };
    });

    const totalCost = args.amount;
    if (challenge && challenge.status === "active") {
      setChallenge((c) => (c ? { ...c, balance: c.balance - totalCost } : c));
    } else {
      setWalletBalance((b) => b - totalCost);
    }
    setPositions((prev) => [...newPositions, ...prev]);
    return newPositions;
  }, [challenge]);

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
        placeBet,
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
