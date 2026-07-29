"use client";

import { useEffect, useState } from "react";
import { fetchHistory } from "@/lib/coingecko";
import { useTrading } from "@/context/TradingContext";
import { AssetId } from "@/lib/types";

const W = 600;
const H = 160;

export default function PriceChart({ asset }: { asset: AssetId }) {
  const { prices, priceReady } = useTrading();
  const [historyByAsset, setHistoryByAsset] = useState<
    Partial<Record<AssetId, number[]>>
  >({});

  useEffect(() => {
    let cancelled = false;
    fetchHistory(asset)
      .then((points) => {
        if (!cancelled) {
          const series = points.map((p) => p.p);
          setHistoryByAsset((prev) => ({ ...prev, [asset]: series }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryByAsset((prev) => ({ ...prev, [asset]: [] }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asset]);

  const history = historyByAsset[asset] ?? null;
  const live = priceReady ? prices[asset] : undefined;
  const series = history && live ? [...history, live] : history;

  if (!series || series.length < 2) {
    return (
      <div className="flex h-40 w-full items-center justify-center border border-line bg-bg-panel-2 font-mono text-xs text-fg-dim">
        loading price history...
      </div>
    );
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const points = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = H - ((p - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = series[series.length - 1] >= series[0];

  return (
    <div className="border border-line bg-bg-panel-2 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        <polyline
          points={points}
          fill="none"
          stroke={up ? "#16a34a" : "#dc2626"}
          strokeWidth="2"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-fg-dim">
        <span>24H LOW ${min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        <span>24H HIGH ${max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}
