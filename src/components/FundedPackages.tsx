"use client";

import { useTrading } from "@/context/TradingContext";
import { FUNDED_TIERS } from "@/lib/types";

export default function FundedPackages() {
  const { challenge, startChallenge, resetChallenge, connected, walletBalance } =
    useTrading();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-fg-dim">
          Funded accounts
        </p>
        <h1 className="mb-2 text-2xl font-bold">Trade with our capital</h1>
        <p className="mb-6 max-w-2xl text-sm text-fg-dim">
          Deposit a small entry fee to unlock a funded challenge account. Hit
          the profit target before you hit the max drawdown, and the reward is
          yours — the trade tab is wired directly to whichever challenge you
          activate, so bets you place there settle straight into this balance.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FUNDED_TIERS.map((tier) => {
            const isActive = challenge?.tierId === tier.id;
            return (
              <div
                key={tier.id}
                className={`flex flex-col border p-4 ${
                  isActive ? "border-brand" : "border-line"
                } bg-bg-panel`}
              >
                <p className="text-[10px] uppercase tracking-widest text-fg-dim">
                  {tier.id}
                </p>
                <p className="mt-1 font-mono text-2xl">
                  ${tier.fundSize.toLocaleString()}
                </p>
                <p className="mb-4 text-[11px] text-fg-dim">funded account</p>

                <dl className="mb-4 space-y-1 text-xs">
                  <Row label="Entry fee" value={`$${tier.depositCost}`} />
                  <Row label="Profit target" value={`+$${tier.profitTarget}`} />
                  <Row label="Max drawdown" value={`-$${tier.maxDrawdown}`} />
                  <Row label="Reward" value={`$${tier.reward}`} />
                </dl>

                {isActive && challenge ? (
                  <ChallengeProgress
                    tierId={tier.id}
                    balance={challenge.balance}
                    status={challenge.status}
                    onReset={resetChallenge}
                  />
                ) : (
                  <button
                    disabled={!connected || walletBalance < tier.depositCost || !!challenge}
                    onClick={() => startChallenge(tier.id)}
                    className="mt-auto w-full border border-brand bg-brand py-2 text-xs font-bold uppercase tracking-wider text-bg disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-fg-dim"
                  >
                    {challenge ? "Challenge in progress" : "Start challenge"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1 font-mono">
      <dt className="text-fg-dim">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ChallengeProgress({
  tierId,
  balance,
  status,
  onReset,
}: {
  tierId: string;
  balance: number;
  status: "active" | "passed" | "failed";
  onReset: () => void;
}) {
  const tier = FUNDED_TIERS.find((t) => t.id === tierId)!;
  const profit = balance - tier.fundSize;
  const span = tier.profitTarget + tier.maxDrawdown;
  const pct = Math.min(100, Math.max(0, ((profit + tier.maxDrawdown) / span) * 100));

  return (
    <div className="mt-auto">
      <div className="mb-1 flex justify-between font-mono text-[11px]">
        <span className="text-fg-dim">balance ${balance.toFixed(2)}</span>
        <span className={profit >= 0 ? "text-up" : "text-down"}>
          {profit >= 0 ? "+" : ""}
          {profit.toFixed(2)}
        </span>
      </div>
      <div className="mb-2 h-1.5 w-full border border-line bg-bg-panel-2">
        <div
          className={`h-full ${status === "failed" ? "bg-down" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {status === "active" && (
        <p className="text-center text-[10px] uppercase tracking-widest text-fg-dim">
          Challenge active
        </p>
      )}
      {status === "passed" && (
        <div className="border border-up p-2 text-center">
          <p className="text-xs font-bold text-up">Target hit — reward ${tier.reward}</p>
          <button onClick={onReset} className="mt-1 text-[10px] text-fg-dim underline">
            claim &amp; start another
          </button>
        </div>
      )}
      {status === "failed" && (
        <div className="border border-down p-2 text-center">
          <p className="text-xs font-bold text-down">Drawdown limit hit</p>
          <button onClick={onReset} className="mt-1 text-[10px] text-fg-dim underline">
            try again
          </button>
        </div>
      )}
    </div>
  );
}
