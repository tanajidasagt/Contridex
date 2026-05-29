"use client";

import { useState } from "react";
import { getFreighterPublicKey, fundWithFriendbot } from "../lib/stellar";

export default function WalletConnect({
  onConnect,
}: {
  onConnect: (pubKey: string) => void;
}) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const pubKey = await getFreighterPublicKey();
      setPublicKey(pubKey);
      onConnect(pubKey);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const fundAccount = async () => {
    if (!publicKey) return;
    setFunding(true);
    setError(null);
    try {
      await fundWithFriendbot(publicKey);
      alert("Account funded successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to fund account");
    } finally {
      setFunding(false);
    }
  };

  const truncatePubKey = (key: string) => {
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-4">
      {error && <span className="text-red-500 text-sm">{error}</span>}

      {publicKey ? (
        <>
          <button
            onClick={fundAccount}
            disabled={funding}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {funding ? "Funding..." : "Get Testnet XLM"}
          </button>

          <div className="px-4 py-2 bg-slate-800 rounded-md text-sm font-mono border border-slate-700">
            {truncatePubKey(publicKey)}
          </div>

          <button
            onClick={() => {
              setPublicKey(null);
              onConnect("");
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
