import { AssetId } from "./types";

const IDS: AssetId[] = ["bitcoin", "ethereum", "solana"];

export interface PricePoint {
  t: number;
  p: number;
}

export async function fetchSpotPrices(): Promise<Record<AssetId, number>> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS.join(
    ","
  )}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`coingecko spot ${res.status}`);
  const data = await res.json();
  return {
    bitcoin: data.bitcoin?.usd,
    ethereum: data.ethereum?.usd,
    solana: data.solana?.usd,
  };
}

export async function fetchHistory(asset: AssetId): Promise<PricePoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${asset}/market_chart?vs_currency=usd&days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`coingecko history ${res.status}`);
  const data = await res.json();
  const prices: [number, number][] = data.prices ?? [];
  return prices.map(([t, p]) => ({ t, p }));
}
