import WalletMenu from "./WalletMenu";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm font-bold tracking-widest">
          ROCKETED<span className="text-brand">.</span>
        </span>
        <WalletMenu />
      </div>
      <nav className="hidden items-center gap-6 text-xs uppercase tracking-widest text-fg-dim sm:flex">
        <a href="#trade" className="hover:text-fg">
          Trade
        </a>
        <a href="#funded" className="hover:text-fg">
          Funded Accounts
        </a>
      </nav>
    </header>
  );
}
