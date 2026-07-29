"use client";

import { useEffect, useState } from "react";
import { useTrading } from "@/context/TradingContext";
import { decayedPayoutMultiplier } from "@/lib/pricing";
import { ASSETS, BET_PRESETS, Position } from "@/lib/types";

const STATUS_LABEL: Record<Position["status"], string> = {
  open: "OPEN",
  won: "WON",
  knocked_out: "KNOCKED OUT",
  cashed_out: "CASHED OUT",
  expired: "EXPIRED",
};

export default function PositionsList() {
  const { positions, cashOut } = useTrading();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
      <div className="max-h-96 overflow-y-auto">
        {positions.map((p) => {
          const symbol = ASSETS.find((a) => a.id === p.asset)?.symbol ?? p.asset;
          const presetLabel = BET_PRESETS.find((b) => b.id === p.presetId)?.label ?? "Custom";
          const statusColor =
            p.status === "won"
              ? "text-up"
              : p.status === "knocked_out"
              ? "text-down"
              : p.status === "cashed_out"
              ? "text-brand"
              : "text-fg-dim";

          const liveMultiplier =
            p.status === "open"
              ? decayedPayoutMultiplier(p.payoutMultiplier, now - p.openedAt)
              : null;
          const achievedMultiplier = p.status === "won" ? p.pnl / p.amount : null;

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
                  <span className="text-fg-dim">{presetLabel}</span>
                  {p.status === "open" && liveMultiplier !== null && (
                    <span className="text-brand">
                      if it hits now: {liveMultiplier.toFixed(2)}x
                    </span>
                  )}
                  {p.status === "won" && achievedMultiplier !== null && (
                    <span className="text-up">paid {achievedMultiplier.toFixed(2)}x</span>
                  )}
                </div>
                <p className="text-[10px] text-fg-dim">
                  entry ${p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {" · "}target ${p.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {" · "}barrier ${p.barrierPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {p.status === "open" && " · payout decays the longer this stays open"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  {p.status === "open" ? (
                    <>
                      <p className={`font-mono text-sm ${p.pnl < 0 ? "text-down" : "text-fg-dim"}`}>
                        {p.pnl.toFixed(2)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-fg-dim">
                        cash out value
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={`font-mono text-sm ${p.pnl > 0 ? "text-up" : p.pnl < 0 ? "text-down" : "text-fg-dim"}`}>
                        {p.pnl >= 0 ? "+" : ""}
                        {p.pnl.toFixed(2)}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wider ${statusColor}`}>
                        {STATUS_LABEL[p.status]}
                      </p>
                    </>
                  )}
                </div>
                {p.status === "open" && (
                  <button
                    onClick={() => cashOut(p.id)}
                    className="border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-dim hover:border-up hover:text-up"
                  >
                    Cash out
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
