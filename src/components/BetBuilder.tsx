"use client";

import { useMemo, useState } from "react";
import { useTrading } from "@/context/TradingContext";
import { AssetId, Direction } from "@/lib/types";

export default function BetBuilder({ asset }: { asset: AssetId }) {
  const { prices, priceReady, placeBet, connected, walletBalance, challenge } =
    useTrading();
  const [direction, setDirection] = useState<Direction>("up");
  const [amount, setAmount] = useState(25);
  const [leverage, setLeverage] = useState(10);
  const [targetPct, setTargetPct] = useState(2);
  const [barrierPct, setBarrierPct] = useState(1);

  const price = priceReady ? prices[asset] : undefined;
  const availableBalance = challenge?.status === "active" ? challenge.balance : walletBalance;

  const preview = useMemo(() => {
    if (!price) return null;
    const upTarget = price * (1 + targetPct / 100);
    const upBarrier = price * (1 - barrierPct / 100);
    const downTarget = price * (1 - targetPct / 100);
    const downBarrier = price * (1 + barrierPct / 100);
    return { upTarget, upBarrier, downTarget, downBarrier };
  }, [price, targetPct, barrierPct]);

  const canSubmit =
    connected && !!price && amount > 0 && amount <= availableBalance;

  function submit() {
    if (!canSubmit) return;
    placeBet({ asset, direction, amount, leverage, targetPct, barrierPct });
  }

  return (
    <div className="border border-line bg-bg-panel p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-fg-dim">
        Build a bet
      </p>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {(["up", "down", "both"] as Direction[]).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={`border py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              direction === d
                ? d === "up"
                  ? "border-up bg-up text-bg"
                  : d === "down"
                  ? "border-down bg-down text-bg"
                  : "border-brand bg-brand text-bg"
                : "border-line text-fg-dim hover:border-fg"
            }`}
          >
            {d === "both" ? "Up + Down" : d}
          </button>
        ))}
      </div>

      <Field label={`Amount (USD) · Available $${availableBalance.toFixed(2)}`}>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border border-line bg-bg-panel-2 px-2 py-2 text-sm font-mono outline-none focus:border-brand"
        />
      </Field>

      <Field label={`Leverage · ${leverage}x`}>
        <input
          type="range"
          min={1}
          max={100}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full"
        />
      </Field>

      <Field label={`Target distance · ${targetPct.toFixed(1)}%`}>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={targetPct}
          onChange={(e) => setTargetPct(Number(e.target.value))}
          className="w-full"
        />
      </Field>

      <Field label={`Barrier distance (knockout) · ${barrierPct.toFixed(1)}%`}>
        <input
          type="range"
          min={0.2}
          max={8}
          step={0.2}
          value={barrierPct}
          onChange={(e) => setBarrierPct(Number(e.target.value))}
          className="w-full"
        />
      </Field>

      {preview && (
        <div className="mb-3 grid grid-cols-2 gap-2 border border-line bg-bg-panel-2 p-2 font-mono text-[11px]">
          {(direction === "up" || direction === "both") && (
            <div>
              <p className="text-up">UP leg</p>
              <p className="text-fg-dim">
                target ${preview.upTarget.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-fg-dim">
                barrier ${preview.upBarrier.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {(direction === "down" || direction === "both") && (
            <div>
              <p className="text-down">DOWN leg</p>
              <p className="text-fg-dim">
                target ${preview.downTarget.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-fg-dim">
                barrier ${preview.downBarrier.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full border border-brand bg-brand py-2.5 text-sm font-bold uppercase tracking-wider text-bg disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-fg-dim"
      >
        {connected ? "Place Bet" : "Connect wallet to trade"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        {label}
      </p>
      {children}
    </div>
  );
}
