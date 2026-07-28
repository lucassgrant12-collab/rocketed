// System 1: pooled/parimutuel pricing. Unlike lib/pricing.ts (which prices
// a fair payout against a house), a pool has no pricing engine at all --
// everyone stakes into a price band, losing bands fund the winning band
// minus a flat platform fee, and the crowd's own stakes set the live odds.
// Volatility is only used once, to size the bands sensibly for whatever the
// current market conditions are.

export const POOL_FEE_RATE = 0.05;
export const BAND_SIGMA_STEP = 0.9;

const BAND_MULTIPLES = [-1.5, -0.5, 0.5, 1.5];

export const BOT_HANDLES = [
  "0xF3a2", "moonboi92", "satoshi_jr", "degen_dave", "liq_hunter",
  "paperhands", "diamond.eth", "vol_surfer", "0x9c1B", "night_owl",
  "rekt_again", "ape_in_99", "quant_kid", "0x77Ad", "hodl4life",
  "fade_the_pump", "0x2Ee1", "scalper_sam", "whale_watch", "sigma_grindset",
];

/** Five bands around the round's opening price, sized to current volatility
 * so "how wide is a band" adapts to whether the market's calm or wild. */
export function generateBandEdges(startPrice: number, sigmaPct: number): number[] {
  const step = (sigmaPct / 100) * BAND_SIGMA_STEP;
  return BAND_MULTIPLES.map((mult) => startPrice * (1 + mult * step));
}

export function bandIndexForPrice(price: number, edges: number[]): number {
  for (let i = 0; i < edges.length; i++) {
    if (price < edges[i]) return i;
  }
  return edges.length;
}

export function bandLabel(index: number, edges: number[]): string {
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (index === 0) return `Below ${fmt(edges[0])}`;
  if (index === edges.length) return `Above ${fmt(edges[edges.length - 1])}`;
  return `${fmt(edges[index - 1])} – ${fmt(edges[index])}`;
}

/** Weight stakes toward the bands nearer the middle -- crowds cluster around
 * "no big move" more than they pile into the tails. */
export function weightedRandomBand(bandCount: number): number {
  const mid = (bandCount - 1) / 2;
  const weights = Array.from({ length: bandCount }, (_, i) => 1 / (1 + Math.abs(i - mid)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < bandCount; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return bandCount - 1;
}
