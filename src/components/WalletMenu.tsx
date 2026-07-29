"use client";

import { useEffect, useRef, useState } from "react";
import { useTrading } from "@/context/TradingContext";

const DEPOSIT_PRESETS = [50, 100, 250, 1000];

export default function WalletMenu() {
  const { connected, walletBalance, connect, disconnect, deposit } =
    useTrading();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "deposit">("menu");
  const [customAmount, setCustomAmount] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-line bg-bg-panel px-3 py-2 text-xs font-mono uppercase tracking-wider text-fg hover:border-up transition-colors"
      >
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-up" : "bg-fg-dim"}`}
          aria-hidden
        />
        {connected ? `$${walletBalance.toFixed(2)}` : "Connect Wallet"}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 border border-line bg-bg-panel">
          {!connected ? (
            <div className="p-3">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-fg-dim">
                Select a wallet
              </p>
              {["MetaMask", "WalletConnect", "Coinbase Wallet", "Phantom"].map(
                (name) => (
                  <button
                    key={name}
                    onClick={() => {
                      connect();
                      setMode("menu");
                    }}
                    className="flex w-full items-center justify-between border border-line bg-bg-panel-2 px-3 py-2 mb-1.5 text-left text-sm hover:border-up transition-colors"
                  >
                    <span>{name}</span>
                    <span className="text-[10px] text-fg-dim">mock</span>
                  </button>
                )
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-fg-dim">
                UI mockup only — no real wallet connection is made in this
                build.
              </p>
            </div>
          ) : mode === "menu" ? (
            <div className="p-3">
              <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
                <span className="text-[10px] uppercase tracking-widest text-fg-dim">
                  Balance
                </span>
                <span className="font-mono text-lg">
                  ${walletBalance.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setMode("deposit")}
                className="mb-1.5 w-full border border-brand bg-brand px-3 py-2 text-left text-sm font-semibold text-bg hover:opacity-90"
              >
                Deposit
              </button>
              <button
                onClick={() => alert("Withdraw is a mockup in this build.")}
                className="mb-1.5 w-full border border-line px-3 py-2 text-left text-sm hover:border-up"
              >
                Withdraw
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="w-full border border-line px-3 py-2 text-left text-sm text-down hover:border-down"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-fg-dim">
                  Deposit
                </span>
                <button
                  onClick={() => setMode("menu")}
                  className="text-[10px] text-fg-dim hover:text-fg"
                >
                  back
                </button>
              </div>
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                {DEPOSIT_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      deposit(amt);
                      setMode("menu");
                    }}
                    className="border border-line bg-bg-panel-2 py-2 text-xs hover:border-up"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="w-full border border-line bg-bg-panel-2 px-2 py-2 text-xs outline-none focus:border-up"
                />
                <button
                  onClick={() => {
                    const n = Number(customAmount);
                    if (n > 0) {
                      deposit(n);
                      setCustomAmount("");
                      setMode("menu");
                    }
                  }}
                  className="border border-brand bg-brand px-3 text-xs font-semibold text-bg"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
