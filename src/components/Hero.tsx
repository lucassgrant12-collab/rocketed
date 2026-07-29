import Link from "next/link";

export default function Hero() {
  return (
    <section className="border-b border-line px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brand">
          Gamified crypto perps
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Bet on what the price does next.
        </h1>
        <p className="mt-4 max-w-xl text-sm text-fg-dim sm:text-base">
          Pick an outcome — will it hit a target before it hits a barrier?
          Bet up, down, or both at once with one tap. Or skip the risk and
          trade a funded account up to a cash reward.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/trade"
            className="border border-brand bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-bg"
          >
            Start betting
          </Link>
          <Link
            href="/funded"
            className="border border-line px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:border-up hover:text-up"
          >
            Get funded
          </Link>
        </div>
      </div>
    </section>
  );
}
