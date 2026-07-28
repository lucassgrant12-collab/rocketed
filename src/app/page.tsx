import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TradePanel from "@/components/TradePanel";
import FundedPackages from "@/components/FundedPackages";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TradePanel />
        <FundedPackages />
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-[10px] uppercase tracking-widest text-fg-dim sm:px-6">
        Rocketed — demo build, mock funds only, no real money at risk.
      </footer>
    </div>
  );
}
