export default function Hero() {
  return (
    <section className="border-b border-line px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brand">
          Gamified crypto perps
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Bet on price. Not just direction.
        </h1>
        <p className="mt-4 max-w-xl text-sm text-fg-dim sm:text-base">
          Set a target, a barrier, and leverage — go up, down, or both at
          once. Or skip the risk entirely and trade a funded account up to a
          reward.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#trade"
            className="border border-brand bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-bg"
          >
            Start trading
          </a>
          <a
            href="#funded"
            className="border border-line px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:border-fg"
          >
            Get funded
          </a>
        </div>
      </div>
    </section>
  );
}
