"use client";

import { useEffect, useMemo, useState } from "react";
import { usePool } from "@/context/PoolContext";
import { useTrading } from "@/context/TradingContext";
import { bandLabel, POOL_FEE_RATE } from "@/lib/pools";

const AMOUNT_CHIPS = [10, 25, 50];

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const PHASE_LABEL: Record<string, string> = {
  staking: "STAKING OPEN",
  locked: "LOCKED — RESOLVING",
  resolved: "ROUND RESOLVED",
};

export default function PoolBoard() {
  const { connected, walletBalance, challenge, prices, priceReady } = useTrading();
  const { phase, roundId, bandEdges, stakes, phaseEndsAt, lastResult, stake } = usePool();
  const [amount, setAmount] = useState(25);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const availableBalance = challenge?.status === "active" ? challenge.balance : walletBalance;
  const secondsLeft = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
  const price = priceReady ? prices.bitcoin : undefined;

  const bandCount = bandEdges.length + 1;
  const bandTotals = useMemo(() => {
    const totals = Array(bandCount).fill(0);
    stakes.forEach((s) => {
      totals[s.bandIndex] += s.amount;
    });
    return totals;
  }, [stakes, bandCount]);
  const totalPool = bandTotals.reduce((a, b) => a + b, 0);
  const distributable = totalPool * (1 - POOL_FEE_RATE);

  const currentBandIndex = useMemo(() => {
    if (price === undefined || bandEdges.length === 0) return null;
    for (let i = 0; i < bandEdges.length; i++) {
      if (price < bandEdges[i]) return i;
    }
    return bandEdges.length;
  }, [price, bandEdges]);

  const feed = [...stakes].sort((a, b) => b.placedAt - a.placedAt).slice(0, 8);

  if (bandEdges.length === 0) {
    return (
      <div className="border border-line bg-bg-panel p-6 text-xs text-fg-dim">
        Waiting for a live price to open the first round...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        Pooled, crowd-priced
      </p>
      <h1 className="mb-2 text-2xl font-bold">Prediction Pools</h1>
      <p className="mb-6 max-w-2xl text-sm text-fg-dim">
        No house, no pricing engine — everyone stakes on which band BTC lands
        in when the round locks. Losing bands fund the winning band, minus a
        flat {Math.round(POOL_FEE_RATE * 100)}% platform fee. The crowd&apos;s
        own money sets the odds.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-4 border border-line bg-bg-panel p-3">
        <span className="font-mono text-xs text-fg-dim">Round #{roundId}</span>
        <span className="font-mono text-xs text-brand">{PHASE_LABEL[phase]}</span>
        <span className="font-mono text-xs text-fg-dim">
          {phase === "staking" ? "closes in" : phase === "locked" ? "resolves in" : "next round in"}{" "}
          <span className="text-fg">{secondsLeft}s</span>
        </span>
        <span className="ml-auto font-mono text-lg">{price ? fmt(price) : "..."}</span>
      </div>

      {lastResult && phase === "resolved" && (
        <div
          className={`mb-4 border p-3 ${
            lastResult.userNet > 0 ? "border-up" : lastResult.userNet < 0 ? "border-down" : "border-line"
          }`}
        >
          <p className="font-mono text-sm">
            Round #{lastResult.roundId} resolved at {fmt(lastResult.resolvedPrice)} — winning band:{" "}
            {bandLabel(lastResult.winningBandIndex, bandEdges)}
          </p>
          <p
            className={`font-mono text-xs ${
              lastResult.userNet > 0 ? "text-up" : lastResult.userNet < 0 ? "text-down" : "text-fg-dim"
            }`}
          >
            {lastResult.userNet > 0
              ? `You won +${fmt(lastResult.userNet)}`
              : lastResult.userNet < 0
              ? `You lost ${fmt(Math.abs(lastResult.userNet))}`
              : "You didn't stake this round"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: bandCount }, (_, i) => i).map((i) => {
            const total = bandTotals[i];
            const share = totalPool > 0 ? total / totalPool : 0;
            const impliedPayout = total > 0 ? distributable / total : null;
            const isCurrent = i === currentBandIndex && phase !== "resolved";
            const isWinner = phase === "resolved" && lastResult?.winningBandIndex === i;

            return (
              <div
                key={i}
                className={`border p-3 ${
                  isWinner ? "border-up bg-bg-panel-2" : isCurrent ? "border-brand bg-bg-panel-2" : "border-line bg-bg-panel"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{bandLabel(i, bandEdges)}</p>
                    {isCurrent && (
                      <span className="border border-brand px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-brand">
                        current
                      </span>
                    )}
                    {isWinner && (
                      <span className="border border-up px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-up">
                        winner
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-fg-dim">
                    {fmt(total)} staked{impliedPayout ? ` · ${impliedPayout.toFixed(2)}x` : ""}
                  </p>
                </div>
                <div className="mb-2 h-1.5 w-full bg-bg-panel-2">
                  <div className="h-full bg-brand" style={{ width: `${Math.max(2, share * 100)}%` }} />
                </div>
                {phase === "staking" && (
                  <button
                    onClick={() => stake(i, amount)}
                    disabled={!connected || amount > availableBalance}
                    className="w-full border border-line py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-dim hover:border-up hover:text-up disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Stake ${amount} here
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-line bg-bg-panel p-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
              Stake amount · Available {fmt(availableBalance)}
            </p>
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {AMOUNT_CHIPS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`border py-2 text-xs font-mono transition-colors ${
                    amount === amt ? "border-brand bg-brand text-bg" : "border-line text-fg-dim hover:border-up"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            {!connected && <p className="text-[11px] text-fg-dim">Connect a wallet to stake</p>}
            {connected && phase !== "staking" && (
              <p className="text-[11px] text-fg-dim">Staking is closed until the next round</p>
            )}
          </div>

          <div className="border border-line bg-bg-panel">
            <div className="border-b border-line px-4 py-2 text-[10px] uppercase tracking-widest text-fg-dim">
              Live activity
            </div>
            <div className="max-h-72 overflow-y-auto">
              {feed.length === 0 && (
                <p className="p-4 text-xs text-fg-dim">No stakes yet this round.</p>
              )}
              {feed.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-line px-4 py-2 font-mono text-[11px] last:border-b-0"
                >
                  <span className={s.isBot ? "text-fg-dim" : "text-brand"}>{s.handle}</span>
                  <span className="text-fg-dim">
                    {fmt(s.amount)} on {bandLabel(s.bandIndex, bandEdges)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-fg-dim">
            This build is BTC-only, and the other bettors here are simulated
            for the demo — there&apos;s no live multiplayer backend yet. The
            round math (pool accounting, fee, live odds) is real.
          </p>
        </div>
      </div>
    </div>
  );
}
