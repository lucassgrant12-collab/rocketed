"use client";

import { useState } from "react";
import { useTrading } from "@/context/TradingContext";
import { AssetId, BET_PRESETS, Position } from "@/lib/types";

const AMOUNT_CHIPS = [10, 25, 50, 100];

export default function BetBuilder({
  asset,
  onPlaced,
}: {
  asset: AssetId;
  onPlaced: (positions: Position[]) => void;
}) {
  const { priceReady, getQuote, placeBet, connected, walletBalance, challenge } =
    useTrading();
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [presetId, setPresetId] = useState("balanced");

  const availableBalance = challenge?.status === "active" ? challenge.balance : walletBalance;
  const canBet = connected && priceReady && amount > 0 && amount <= availableBalance;

  const upQuote = priceReady ? getQuote(asset, "up", presetId) : null;
  const downQuote = priceReady ? getQuote(asset, "down", presetId) : null;

  function fmt(n: number) {
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  function bet(direction: "up" | "down" | "both") {
    if (!canBet) return;
    const positions = placeBet({ asset, direction, amount, presetId });
    if (positions) onPlaced(positions);
  }

  return (
    <div className="border border-line bg-bg-panel p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-fg-dim">
        What will the price do?
      </p>

      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        Bet amount · Available {fmt(availableBalance)}
      </p>
      <div className="mb-4 grid grid-cols-5 gap-1.5">
        {AMOUNT_CHIPS.map((amt) => (
          <button
            key={amt}
            onClick={() => {
              setAmount(amt);
              setCustomAmount("");
            }}
            className={`border py-2 text-xs font-mono transition-colors ${
              amount === amt && !customAmount
                ? "border-brand bg-brand text-bg"
                : "border-line text-fg-dim hover:border-fg"
            }`}
          >
            ${amt}
          </button>
        ))}
        <input
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            const n = Number(e.target.value);
            if (n > 0) setAmount(n);
          }}
          placeholder="other"
          className="w-full border border-line bg-bg-panel-2 px-1 py-2 text-center text-xs font-mono outline-none focus:border-brand"
        />
      </div>

      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        Risk level · payout updates live with volatility
      </p>
      <div className="mb-4 grid grid-cols-3 gap-1.5">
        {BET_PRESETS.map((p) => {
          const quote = priceReady ? getQuote(asset, "up", p.id) : null;
          return (
            <button
              key={p.id}
              onClick={() => setPresetId(p.id)}
              className={`border p-2 text-left transition-colors ${
                presetId === p.id
                  ? "border-brand bg-bg-panel-2"
                  : "border-line hover:border-fg"
              }`}
            >
              <p className="text-xs font-semibold">{p.label}</p>
              <p className="text-[10px] text-fg-dim">{p.blurb}</p>
              <p className="mt-1 font-mono text-[11px] text-brand">
                {quote ? `~${quote.payoutMultiplier.toFixed(2)}x` : "..."}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        Tap an outcome to bet ${amount} now
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => bet("up")}
          disabled={!canBet}
          className="border border-up p-3 text-left transition-colors hover:bg-up/10 disabled:cursor-not-allowed disabled:border-line disabled:hover:bg-transparent"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-up">
              ▲ Hits {upQuote ? fmt(upQuote.targetPrice) : "..."} first
            </p>
            <p className="font-mono text-xs text-up">
              {upQuote ? `${upQuote.payoutMultiplier.toFixed(2)}x` : ""}
            </p>
          </div>
          <p className="text-[11px] text-fg-dim">
            before it drops to {upQuote ? fmt(upQuote.barrierPrice) : "..."}
            {upQuote ? ` · ${Math.round(upQuote.winProbability * 100)}% odds` : ""}
          </p>
        </button>

        <button
          onClick={() => bet("down")}
          disabled={!canBet}
          className="border border-down p-3 text-left transition-colors hover:bg-down/10 disabled:cursor-not-allowed disabled:border-line disabled:hover:bg-transparent"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-down">
              ▼ Hits {downQuote ? fmt(downQuote.targetPrice) : "..."} first
            </p>
            <p className="font-mono text-xs text-down">
              {downQuote ? `${downQuote.payoutMultiplier.toFixed(2)}x` : ""}
            </p>
          </div>
          <p className="text-[11px] text-fg-dim">
            before it rises to {downQuote ? fmt(downQuote.barrierPrice) : "..."}
            {downQuote ? ` · ${Math.round(downQuote.winProbability * 100)}% odds` : ""}
          </p>
        </button>

        <button
          onClick={() => bet("both")}
          disabled={!canBet}
          className="border border-brand p-3 text-left transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:border-line disabled:hover:bg-transparent"
        >
          <p className="font-mono text-sm text-brand">⇅ Either outcome hits first</p>
          <p className="text-[11px] text-fg-dim">
            opens both bets at once, ${amount} split evenly between them
          </p>
        </button>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-fg-dim">
        Odds and payout are priced live off recent volatility, then locked in
        the moment you bet. You can also cash out early from an open position
        for its current value — see the positions list.
      </p>

      {!connected && (
        <p className="mt-2 text-center text-[11px] text-fg-dim">
          Connect a wallet to bet
        </p>
      )}
      {connected && amount > availableBalance && (
        <p className="mt-2 text-center text-[11px] text-down">
          Not enough balance for that bet size
        </p>
      )}
    </div>
  );
}
