"use client";

import { useEffect, useRef, useState } from "react";
import PriceChart from "./PriceChart";
import BetBuilder from "./BetBuilder";
import PositionsList from "./PositionsList";
import { useTrading } from "@/context/TradingContext";
import { ASSETS, AssetId, Position } from "@/lib/types";

export default function TradePanel() {
  const [asset, setAsset] = useState<AssetId>("bitcoin");
  const { prices, priceReady } = useTrading();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function handlePlaced(positions: Position[]) {
    const symbol = ASSETS.find((a) => a.id === asset)?.symbol ?? asset;
    const label =
      positions.length === 2
        ? `Bet placed on ${symbol} — both outcomes`
        : `Bet placed on ${symbol} — ${positions[0].side === "up" ? "up" : "down"}`;
    setToast(label);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
        Perps, gamified
      </p>
      <h1 className="mb-6 text-2xl font-bold">Fast-paced price betting</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ASSETS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAsset(a.id)}
            className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              asset === a.id
                ? "border-brand bg-brand text-bg"
                : "border-line text-fg-dim hover:border-fg"
            }`}
          >
            {a.symbol}
          </button>
        ))}
        <span className="ml-2 font-mono text-lg">
          {priceReady
            ? `$${prices[asset].toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}`
            : "..."}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <PriceChart asset={asset} />
          <PositionsList />
        </div>
        <BetBuilder asset={asset} onPlaced={handlePlaced} />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-brand bg-bg px-4 py-2.5 font-mono text-xs text-brand shadow-none">
          {toast}
        </div>
      )}
    </div>
  );
}
