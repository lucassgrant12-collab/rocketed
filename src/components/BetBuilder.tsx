"use client";

import { useState } from "react";
import { useTrading } from "@/context/TradingContext";
import { MAX_CUSTOM_BARRIER_DISTANCE } from "@/lib/pricing";
import { AssetId, BET_PRESETS, Position } from "@/lib/types";

const AMOUNT_CHIPS = [10, 25, 50, 100];

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function BetBuilder({
  asset,
  onPlaced,
}: {
  asset: AssetId;
  onPlaced: (positions: Position[]) => void;
}) {
  const { connected, walletBalance, challenge } = useTrading();
  const [mode, setMode] = useState<"quick" | "custom">("quick");
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");

  const availableBalance = challenge?.status === "active" ? challenge.balance : walletBalance;

  return (
    <div className="border border-line bg-bg-panel p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-fg-dim">
        What will the price do?
      </p>

      <div className="mb-4 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => setMode("quick")}
          className={`border py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            mode === "quick" ? "border-brand bg-brand text-bg" : "border-line text-fg-dim hover:border-fg"
          }`}
        >
          Quick
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`border py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            mode === "custom" ? "border-brand bg-brand text-bg" : "border-line text-fg-dim hover:border-fg"
          }`}
        >
          Custom prices
        </button>
      </div>

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

      {mode === "quick" ? (
        <QuickBet asset={asset} amount={amount} availableBalance={availableBalance} onPlaced={onPlaced} />
      ) : (
        <CustomBet asset={asset} amount={amount} availableBalance={availableBalance} onPlaced={onPlaced} />
      )}

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

function QuickBet({
  asset,
  amount,
  availableBalance,
  onPlaced,
}: {
  asset: AssetId;
  amount: number;
  availableBalance: number;
  onPlaced: (positions: Position[]) => void;
}) {
  const { priceReady, getQuote, placeBet, connected } = useTrading();
  const [presetId, setPresetId] = useState("balanced");

  const canBet = connected && priceReady && amount > 0 && amount <= availableBalance;
  const upQuote = priceReady ? getQuote(asset, "up", presetId) : null;
  const downQuote = priceReady ? getQuote(asset, "down", presetId) : null;

  function bet(direction: "up" | "down" | "both") {
    if (!canBet) return;
    const positions = placeBet({ asset, direction, amount, presetId });
    if (positions) onPlaced(positions);
  }

  return (
    <>
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
        Odds are priced live off recent volatility, then locked in the moment
        you bet — but the payout decays the longer the bet stays open, so
        waiting it out quietly costs you. You can cash out early any time,
        but only to cut a loss short: cashing out never pays a profit, only
        actually hitting the target does.
      </p>
    </>
  );
}

function CustomBet({
  asset,
  amount,
  availableBalance,
  onPlaced,
}: {
  asset: AssetId;
  amount: number;
  availableBalance: number;
  onPlaced: (positions: Position[]) => void;
}) {
  const { prices, priceReady, previewCustomBet, placeCustomBet, connected } = useTrading();
  const [targetInput, setTargetInput] = useState("");
  const [barrierInput, setBarrierInput] = useState("");
  const [leverage, setLeverage] = useState(10);

  const price = priceReady ? prices[asset] : undefined;
  const targetPrice = Number(targetInput);
  const barrierPrice = Number(barrierInput);
  const bothTyped = targetInput !== "" && barrierInput !== "";
  const preview = bothTyped ? previewCustomBet(asset, targetPrice, barrierPrice) : null;

  const sameSide = bothTyped && price !== undefined && (targetPrice > price) === (barrierPrice > price);
  const barrierTooFar =
    bothTyped && price !== undefined && !sameSide && Math.abs(barrierPrice - price) > MAX_CUSTOM_BARRIER_DISTANCE;

  const canBet = connected && !!preview && amount > 0 && amount <= availableBalance;

  function bet() {
    if (!canBet || !preview) return;
    const positions = placeCustomBet({ asset, amount, targetPrice, barrierPrice, leverage });
    if (positions) onPlaced(positions);
  }

  return (
    <>
      <p className="mb-2 text-[10px] leading-relaxed text-fg-dim">
        Type the exact prices you&apos;re betting on. Current price:{" "}
        <span className="font-mono text-fg">{price ? fmt(price) : "..."}</span>
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
            Hits this price first
          </p>
          <input
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="e.g. 66000"
            inputMode="decimal"
            className="w-full border border-line bg-bg-panel-2 px-2 py-2 text-sm font-mono outline-none focus:border-brand"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
            Before dropping/rising to
          </p>
          <input
            value={barrierInput}
            onChange={(e) => setBarrierInput(e.target.value)}
            placeholder="e.g. 65000"
            inputMode="decimal"
            className="w-full border border-line bg-bg-panel-2 px-2 py-2 text-sm font-mono outline-none focus:border-brand"
          />
        </div>
      </div>

      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        Leverage (cash-out sensitivity) · {leverage}x
      </p>
      <input
        type="range"
        min={1}
        max={100}
        value={leverage}
        onChange={(e) => setLeverage(Number(e.target.value))}
        className="mb-4 w-full"
      />

      {sameSide && (
        <p className="mb-3 border border-down p-2 text-[11px] text-down">
          Those two prices need to be on opposite sides of the current price
          {price ? ` (${fmt(price)})` : ""} — one above, one below.
        </p>
      )}
      {barrierTooFar && (
        <p className="mb-3 border border-down p-2 text-[11px] text-down">
          The &quot;before dropping/rising to&quot; price can&apos;t be more
          than {fmt(MAX_CUSTOM_BARRIER_DISTANCE)} away from the current price.
        </p>
      )}

      {preview && (
        <div
          className={`mb-3 border p-3 ${preview.side === "up" ? "border-up" : "border-down"}`}
        >
          <div className="flex items-center justify-between">
            <p className={`font-mono text-sm ${preview.side === "up" ? "text-up" : "text-down"}`}>
              {preview.side === "up" ? "▲" : "▼"} Hits {fmt(targetPrice)} first
            </p>
            <p className={`font-mono text-xs ${preview.side === "up" ? "text-up" : "text-down"}`}>
              {preview.payoutMultiplier.toFixed(2)}x
            </p>
          </div>
          <p className="text-[11px] text-fg-dim">
            before it {preview.side === "up" ? "drops" : "rises"} to {fmt(barrierPrice)} ·{" "}
            {Math.round(preview.winProbability * 100)}% odds
          </p>
        </div>
      )}

      <button
        onClick={bet}
        disabled={!canBet}
        className="w-full border border-brand bg-brand py-2.5 text-sm font-bold uppercase tracking-wider text-bg disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-fg-dim"
      >
        {preview ? `Bet $${amount} on this outcome` : "Type both prices to see odds"}
      </button>
    </>
  );
}
