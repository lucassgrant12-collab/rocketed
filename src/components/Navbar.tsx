"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletMenu from "./WalletMenu";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/trade", label: "Trade" },
  { href: "/funded", label: "Funded Accounts" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold tracking-widest">
            ROCKETED<span className="text-brand">.</span>
          </span>
          <WalletMenu />
        </div>
      </div>
      <nav className="flex items-center gap-1 px-4 sm:px-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                active
                  ? "border-brand text-fg"
                  : "border-transparent text-fg-dim hover:text-fg"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
