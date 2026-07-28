export type AssetId = "bitcoin" | "ethereum" | "solana";

export const ASSETS: { id: AssetId; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

export type Direction = "up" | "down" | "both";

export type PositionStatus = "open" | "won" | "knocked_out" | "expired";

export interface Position {
  id: string;
  asset: AssetId;
  side: "up" | "down";
  amount: number;
  leverage: number;
  entryPrice: number;
  targetPrice: number;
  barrierPrice: number;
  payoutMultiplier: number;
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
  targetPct: number;
  barrierPct: number;
  leverage: number;
  payoutMultiplier: number;
}

export const BET_PRESETS: BetPreset[] = [
  {
    id: "safe",
    label: "Safe",
    blurb: "Small move, wide safety net",
    targetPct: 1,
    barrierPct: 3,
    leverage: 5,
    payoutMultiplier: 1.3,
  },
  {
    id: "balanced",
    label: "Balanced",
    blurb: "Even odds",
    targetPct: 2,
    barrierPct: 1.5,
    leverage: 10,
    payoutMultiplier: 1.8,
  },
  {
    id: "bold",
    label: "Bold",
    blurb: "Big move, tight barrier",
    targetPct: 4,
    barrierPct: 1,
    leverage: 20,
    payoutMultiplier: 2.6,
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
