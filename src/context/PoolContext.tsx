"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTrading } from "./TradingContext";
import { realizedSigmaPct } from "@/lib/pricing";
import {
  BOT_HANDLES,
  bandIndexForPrice,
  generateBandEdges,
  POOL_FEE_RATE,
  weightedRandomBand,
} from "@/lib/pools";

const STAKE_MS = 25_000;
const LOCK_MS = 5_000;
const RESULTS_MS = 6_000;
const TICK_MS = 250;
const HISTORY_LIMIT = 200;

export type PoolPhase = "staking" | "locked" | "resolved";

export interface Stake {
  id: string;
  bandIndex: number;
  amount: number;
  isBot: boolean;
  handle: string;
  placedAt: number;
}

export interface RoundResult {
  roundId: number;
  winningBandIndex: number;
  resolvedPrice: number;
  totalPool: number;
  userNet: number;
}

interface PoolState {
  phase: PoolPhase;
  roundId: number;
  startPrice: number | null;
  bandEdges: number[];
  stakes: Stake[];
  phaseEndsAt: number;
  lastResult: RoundResult | null;
  stake: (bandIndex: number, amount: number) => void;
}

const PoolContext = createContext<PoolState | null>(null);

export function PoolProvider({ children }: { children: React.ReactNode }) {
  const {
    prices,
    priceReady,
    connected,
    walletBalance,
    challenge,
    debitActiveBalance,
    creditActiveBalance,
  } = useTrading();

  const [phase, setPhase] = useState<PoolPhase>("staking");
  const [roundId, setRoundId] = useState(1);
  const [startPrice, setStartPrice] = useState<number | null>(null);
  const [bandEdges, setBandEdges] = useState<number[]>([]);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number>(() => Date.now() + STAKE_MS);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  const priceRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const botTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!priceReady) return;
    priceRef.current = prices.bitcoin;
    const h = historyRef.current;
    h.push(prices.bitcoin);
    if (h.length > HISTORY_LIMIT) h.shift();
  }, [prices, priceReady]);

  const clearBotTimers = useCallback(() => {
    botTimers.current.forEach(clearTimeout);
    botTimers.current = [];
  }, []);

  const scheduleBots = useCallback((bandCount: number) => {
    const botCount = 6 + Math.floor(Math.random() * 9);
    for (let i = 0; i < botCount; i++) {
      const delay = Math.random() * Math.max(1000, STAKE_MS - 1500);
      const t = setTimeout(() => {
        const handle = BOT_HANDLES[Math.floor(Math.random() * BOT_HANDLES.length)];
        const bandIndex = weightedRandomBand(bandCount);
        const amount = Math.round((5 + Math.random() * 75) * 100) / 100;
        setStakes((prev) => [
          ...prev,
          { id: `bot-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, bandIndex, amount, isBot: true, handle, placedAt: Date.now() },
        ]);
      }, delay);
      botTimers.current.push(t);
    }
  }, []);

  // Kick off the very first round once a live price is available. Deferred
  // to a microtask so the state updates aren't dispatched synchronously
  // within the effect body itself.
  useEffect(() => {
    if (startPrice !== null || !priceReady) return;
    queueMicrotask(() => {
      const sigma = realizedSigmaPct(historyRef.current);
      const edges = generateBandEdges(prices.bitcoin, sigma);
      setStartPrice(prices.bitcoin);
      setBandEdges(edges);
      setPhaseEndsAt(Date.now() + STAKE_MS);
      scheduleBots(edges.length + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceReady]);

  // Round state machine: staking -> locked -> resolved -> staking (next round).
  useEffect(() => {
    if (startPrice === null) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now < phaseEndsAt) return;

      if (phase === "staking") {
        clearBotTimers();
        setPhase("locked");
        setPhaseEndsAt(now + LOCK_MS);
        return;
      }

      if (phase === "locked") {
        const resolvedPrice = priceRef.current;
        if (resolvedPrice === null) return;

        setStakes((currentStakes) => {
          const winningBandIndex = bandIndexForPrice(resolvedPrice, bandEdges);
          const totalPool = currentStakes.reduce((sum, s) => sum + s.amount, 0);
          const winningTotal = currentStakes
            .filter((s) => s.bandIndex === winningBandIndex)
            .reduce((sum, s) => sum + s.amount, 0);
          const distributable = totalPool * (1 - POOL_FEE_RATE);

          let userNet = 0;
          if (winningTotal > 0) {
            currentStakes
              .filter((s) => !s.isBot && s.bandIndex === winningBandIndex)
              .forEach((s) => {
                const payout = (s.amount / winningTotal) * distributable;
                creditActiveBalance(payout);
                userNet += payout;
              });
          }
          const userStakeTotal = currentStakes
            .filter((s) => !s.isBot)
            .reduce((sum, s) => sum + s.amount, 0);
          userNet -= userStakeTotal;

          setLastResult({ roundId, winningBandIndex, resolvedPrice, totalPool, userNet });
          return currentStakes;
        });

        setPhase("resolved");
        setPhaseEndsAt(now + RESULTS_MS);
        return;
      }

      // resolved -> start the next round
      const price = priceRef.current;
      if (price === null) return;
      const sigma = realizedSigmaPct(historyRef.current);
      const edges = generateBandEdges(price, sigma);
      setStartPrice(price);
      setBandEdges(edges);
      setStakes([]);
      setRoundId((r) => r + 1);
      setPhase("staking");
      setPhaseEndsAt(now + STAKE_MS);
      scheduleBots(edges.length + 1);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [phase, phaseEndsAt, bandEdges, roundId, startPrice, creditActiveBalance, clearBotTimers, scheduleBots]);

  useEffect(() => () => clearBotTimers(), [clearBotTimers]);

  const stake = useCallback(
    (bandIndex: number, amount: number) => {
      if (phase !== "staking" || !connected || amount <= 0) return;
      const available = challenge?.status === "active" ? challenge.balance : walletBalance;
      if (amount > available) return;
      debitActiveBalance(amount);
      setStakes((prev) => [
        ...prev,
        {
          id: `you-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          bandIndex,
          amount,
          isBot: false,
          handle: "You",
          placedAt: Date.now(),
        },
      ]);
    },
    [phase, connected, challenge, walletBalance, debitActiveBalance]
  );

  return (
    <PoolContext.Provider
      value={{ phase, roundId, startPrice, bandEdges, stakes, phaseEndsAt, lastResult, stake }}
    >
      {children}
    </PoolContext.Provider>
  );
}

export function usePool() {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error("usePool must be used within PoolProvider");
  return ctx;
}
