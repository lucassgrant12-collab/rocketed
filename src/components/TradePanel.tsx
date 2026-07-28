"use client";

import { useState } from "react";
import PriceChart from "./PriceChart";
import BetBuilder from "./BetBuilder";
import PositionsList from "./PositionsList";
import { useTrading } from "@/context/TradingContext";
import { ASSETS, AssetId } from "@/lib/types";

export default function TradePanel() {
  const [asset, setAsset] = useState<AssetId>("bitcoin");
  const { prices, priceReady } = useTrading();

  return (
    <section id="trade" className="border-t border-line px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
          Perps, gamified
        </p>
        <h2 className="mb-6 text-2xl font-bold">Fast-paced price betting</h2>

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
          <BetBuilder asset={asset} />
        </div>
      </div>
    </section>
  );
}
