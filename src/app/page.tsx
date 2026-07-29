import Hero from "@/components/Hero";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/trade"
            className="border border-line bg-bg-panel p-6 transition-colors hover:border-brand"
          >
            <p className="mb-2 text-[10px] uppercase tracking-widest text-fg-dim">
              Tab 01
            </p>
            <p className="mb-2 text-lg font-bold">Trade</p>
            <p className="text-sm text-fg-dim">
              Live BTC / ETH / SOL prices. Pick a risk level or type your own
              prices, tap an outcome, watch it resolve in real time.
            </p>
          </Link>
          <Link
            href="/pools"
            className="border border-line bg-bg-panel p-6 transition-colors hover:border-brand"
          >
            <p className="mb-2 text-[10px] uppercase tracking-widest text-fg-dim">
              Tab 02
            </p>
            <p className="mb-2 text-lg font-bold">Pools</p>
            <p className="text-sm text-fg-dim">
              No house — stake into a price band with the crowd. Losing bands
              fund the winning band, live odds shift as people pile in.
            </p>
          </Link>
          <Link
            href="/funded"
            className="border border-line bg-bg-panel p-6 transition-colors hover:border-brand"
          >
            <p className="mb-2 text-[10px] uppercase tracking-widest text-fg-dim">
              Tab 03
            </p>
            <p className="mb-2 text-lg font-bold">Funded Accounts</p>
            <p className="text-sm text-fg-dim">
              Deposit a small entry fee, trade a much larger funded balance,
              hit the profit target, unlock the reward.
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
