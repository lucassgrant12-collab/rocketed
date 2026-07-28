import { BetPreset } from "./types";

// Fair-odds barrier pricing: treats log-price as a driftless martingale and
// uses the classic gambler's-ruin / first-passage result for the probability
// of hitting one of two boundaries first. That probability only depends on
// log-distance to each boundary -- it needs no volatility input on its own.
// Volatility comes in one step earlier: it sets *how far away* the target
// and barrier are placed for a given risk preset, so "Bold" means something
// different in a calm market than in a volatile one.

const HORIZON_TICKS = 300; // ~5 minutes of 1s ticks: the "typical move" horizon presets are scaled against
const FALLBACK_SIGMA_PCT = 0.8;
const MIN_SIGMA_PCT = 0.2;
const MAX_SIGMA_PCT = 6;

const HOUSE_EDGE = 0.95; // platform keeps ~5% of fair odds
const MIN_PAYOUT = 1.05;
const MAX_PAYOUT = 15;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Realized volatility from a rolling window of prices, expressed as a
 * percent "typical move" over HORIZON_TICKS, with sane fallbacks/clamping
 * for a thin or brand-new price history. */
export function realizedSigmaPct(history: number[]): number {
  if (history.length < 10) return FALLBACK_SIGMA_PCT;

  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    returns.push(Math.log(history[i] / history[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const tickSigma = Math.sqrt(variance);
  const horizonSigma = tickSigma * Math.sqrt(HORIZON_TICKS);

  return clamp(horizonSigma * 100, MIN_SIGMA_PCT, MAX_SIGMA_PCT);
}

/** Probability that price hits `targetPrice` before `barrierPrice`, given a
 * driftless-martingale assumption on log-price. This is side-agnostic: it
 * works the same whether the target is above or below the barrier. */
export function firstPassageWinProb(
  entryPrice: number,
  targetPrice: number,
  barrierPrice: number
): number {
  const upper = Math.max(targetPrice, barrierPrice);
  const lower = Math.min(targetPrice, barrierPrice);
  if (upper === lower) return 0.5;

  const x0 = Math.log(entryPrice);
  const u = Math.log(upper);
  const l = Math.log(lower);
  const pHitUpperFirst = clamp((x0 - l) / (u - l), 0.01, 0.99);

  return targetPrice > barrierPrice ? pHitUpperFirst : 1 - pHitUpperFirst;
}

export interface Quote {
  targetPrice: number;
  barrierPrice: number;
  winProbability: number;
  payoutMultiplier: number;
}

/** Prices a bet: turns a risk preset + current volatility into concrete
 * target/barrier prices and a fair (house-edged) payout multiplier. */
export function quoteBet(
  entryPrice: number,
  side: "up" | "down",
  preset: BetPreset,
  sigmaPct: number
): Quote {
  const targetPct = preset.targetVolMult * sigmaPct;
  const barrierPct = preset.barrierVolMult * sigmaPct;

  const targetPrice =
    side === "up"
      ? entryPrice * (1 + targetPct / 100)
      : entryPrice * (1 - targetPct / 100);
  const barrierPrice =
    side === "up"
      ? entryPrice * (1 - barrierPct / 100)
      : entryPrice * (1 + barrierPct / 100);

  const winProbability = firstPassageWinProb(entryPrice, targetPrice, barrierPrice);
  const payoutMultiplier = clamp(
    HOUSE_EDGE / winProbability,
    MIN_PAYOUT,
    MAX_PAYOUT
  );

  return { targetPrice, barrierPrice, winProbability, payoutMultiplier };
}
