export type AssetId = "bitcoin" | "ethereum" | "solana";

export const ASSETS: { id: AssetId; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

export type Direction = "up" | "down" | "both";

export type PositionStatus =
  | "open"
  | "won"
  | "knocked_out"
  | "cashed_out"
  | "expired";

export interface Position {
  id: string;
  asset: AssetId;
  side: "up" | "down";
  presetId: string;
  amount: number;
  leverage: number;
  entryPrice: number;
  targetPrice: number;
  barrierPrice: number;
  payoutMultiplier: number;
  winProbability: number;
  openedAt: number;
  status: PositionStatus;
  closedAt?: number;
  closePrice?: number;
  pnl: number;
}

export interface BetPreset {
  id: string;
  label: string;
  blurb: string;
  /** Target/barrier distance, as a multiple of realized volatility. */
  targetVolMult: number;
  barrierVolMult: number;
  /** Scales how fast the cash-out-now value moves while the bet is open. */
  leverage: number;
}

export const BET_PRESETS: BetPreset[] = [
  {
    id: "safe",
    label: "Safe",
    blurb: "Small move, wide safety net",
    targetVolMult: 0.6,
    barrierVolMult: 3.5,
    leverage: 4,
  },
  {
    id: "balanced",
    label: "Balanced",
    blurb: "Even odds",
    targetVolMult: 1.5,
    barrierVolMult: 1.5,
    leverage: 10,
  },
  {
    id: "bold",
    label: "Bold",
    blurb: "Big move, tight barrier",
    targetVolMult: 3.5,
    barrierVolMult: 0.6,
    leverage: 25,
  },
];

export interface FundedTier {
  id: string;
  depositCost: number;
  fundSize: number;
  profitTarget: number;
  maxDrawdown: number;
  reward: number;
}

export const FUNDED_TIERS: FundedTier[] = [
  {
    id: "starter",
    depositCost: 50,
    fundSize: 1000,
    profitTarget: 100,
    maxDrawdown: 100,
    reward: 200,
  },
  {
    id: "growth",
    depositCost: 150,
    fundSize: 3000,
    profitTarget: 300,
    maxDrawdown: 300,
    reward: 600,
  },
  {
    id: "pro",
    depositCost: 400,
    fundSize: 10000,
    profitTarget: 1000,
    maxDrawdown: 800,
    reward: 2000,
  },
];

export type ChallengeStatus = "active" | "passed" | "failed";

export interface ActiveChallenge {
  tierId: string;
  startedAt: number;
  balance: number;
  status: ChallengeStatus;
}
