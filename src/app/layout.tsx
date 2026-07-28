import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TradingProvider } from "@/context/TradingContext";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rocketed — Gamified Crypto Perps",
  description: "Fast-paced gamified crypto perps trading and funded accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TradingProvider>
          <div className="flex min-h-full flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-line px-4 py-6 text-center text-[10px] uppercase tracking-widest text-fg-dim sm:px-6">
              Rocketed — demo build, mock funds only, no real money at risk.
            </footer>
          </div>
        </TradingProvider>
      </body>
    </html>
  );
}
