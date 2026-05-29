"use client";

import { useState } from "react";
import WalletConnect from "../components/WalletConnect";
import MainFeature from "../components/MainFeature";

export default function Home() {
  const [publicKey, setPublicKey] = useState("");

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                StellarCrowd
              </h1>
            </div>
            <WalletConnect onConnect={setPublicKey} />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            Fund the Future on Stellar
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A decentralized crowdfunding platform. Back your favorite projects
            securely using XLM on the Stellar network.
          </p>
        </div>

        <MainFeature publicKey={publicKey} />
      </div>
    </main>
  );
}
