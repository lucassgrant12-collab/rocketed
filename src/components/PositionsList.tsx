"use client";

import { useTrading } from "@/context/TradingContext";
import { ASSETS, Position } from "@/lib/types";

const STATUS_LABEL: Record<Position["status"], string> = {
  open: "OPEN",
  won: "WON",
  knocked_out: "KNOCKED OUT",
  expired: "EXPIRED",
};

export default function PositionsList() {
  const { positions } = useTrading();

  if (positions.length === 0) {
    return (
      <div className="border border-line bg-bg-panel p-4 text-xs text-fg-dim">
        No positions yet. Place a bet to see it tracked here in real time.
      </div>
    );
  }

  return (
    <div className="border border-line bg-bg-panel">
      <div className="border-b border-line px-4 py-2 text-[10px] uppercase tracking-widest text-fg-dim">
        Positions ({positions.length})
      </div>
      <div className="max-h-80 overflow-y-auto">
        {positions.map((p) => {
          const symbol = ASSETS.find((a) => a.id === p.asset)?.symbol ?? p.asset;
          const pnlColor = p.pnl > 0 ? "text-up" : p.pnl < 0 ? "text-down" : "text-fg-dim";
          const statusColor =
            p.status === "won"
              ? "text-up"
              : p.status === "knocked_out"
              ? "text-down"
              : "text-fg-dim";
          return (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className={p.side === "up" ? "text-up" : "text-down"}>
                    {p.side === "up" ? "▲" : "▼"} {symbol}
                  </span>
                  <span className="text-fg-dim">{p.leverage}x</span>
                </div>
                <p className="text-[10px] text-fg-dim">
                  entry ${p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {" · "}target ${p.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {" · "}barrier ${p.barrierPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm ${pnlColor}`}>
                  {p.pnl >= 0 ? "+" : ""}
                  {p.pnl.toFixed(2)}
                </p>
                <p className={`text-[10px] uppercase tracking-wider ${statusColor}`}>
                  {STATUS_LABEL[p.status]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
