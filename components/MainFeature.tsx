"use client";

import { useState, useEffect } from "react";
import {
  getCampaignState,
  contribute,
  claimFunds,
  withdrawFunds,
} from "../lib/contract";

export default function MainFeature({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("10");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchState = async () => {
    setLoading(true);
    try {
      const result = await getCampaignState();
      setState(result);
      setError(null);
    } catch (err: any) {
      setError(
        err.message ||
          "Error fetching campaign state. Ensure contract is deployed and .env is set.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContribute = async () => {
    if (!publicKey) return alert("Please connect wallet first");
    setActionLoading(true);
    try {
      await contribute(publicKey, amount);
      alert("Contribution successful!");
      fetchState();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!publicKey) return alert("Please connect wallet first");
    setActionLoading(true);
    try {
      await claimFunds(publicKey);
      alert("Claim successful!");
      fetchState();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey) return alert("Please connect wallet first");
    setActionLoading(true);
    try {
      await withdrawFunds(publicKey);
      alert("Withdrawal successful!");
      fetchState();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400">Loading campaign...</div>
    );
  if (!state)
    return (
      <div className="p-8 text-center text-red-400">
        {error || "Campaign not found"}
      </div>
    );

  const totalFunded = Number(state.totalFunded) / 10000000;
  const goal = Number(state.goal) / 10000000;
  const progress = Math.min((totalFunded / goal) * 100, 100);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= state.deadline;
  const isGoalMet = totalFunded >= goal;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-800 rounded-xl border border-slate-700 mt-8 shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Crowdfunding Campaign</h2>

      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-slate-300">Progress</span>
          <span className="font-medium">
            {totalFunded} / {goal} XLM ({progress.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-4">
          <div
            className="bg-indigo-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 p-4 rounded-lg">
          <p className="text-slate-400 text-sm mb-1">Status</p>
          <p className="font-semibold">
            {state.claimed
              ? "Claimed"
              : isExpired
                ? isGoalMet
                  ? "Successful"
                  : "Failed"
                : "Active"}
          </p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg">
          <p className="text-slate-400 text-sm mb-1">Time Left</p>
          <p className="font-semibold">
            {isExpired
              ? "Expired"
              : `${Math.ceil((state.deadline - now) / 3600)} hours`}
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-700 pt-6">
        {!isExpired && (
          <div className="flex gap-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-4 py-2 focus:outline-none focus:border-indigo-500"
              placeholder="Amount in XLM"
              min="1"
            />
            <button
              onClick={handleContribute}
              disabled={actionLoading || !publicKey}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Contribute"}
            </button>
          </div>
        )}

        {isExpired && isGoalMet && !state.claimed && (
          <button
            onClick={handleClaim}
            disabled={actionLoading || !publicKey}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading ? "Processing..." : "Claim Funds (Creator Only)"}
          </button>
        )}

        {isExpired && !isGoalMet && (
          <button
            onClick={handleWithdraw}
            disabled={actionLoading || !publicKey}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading ? "Processing..." : "Withdraw Funds"}
          </button>
        )}

        {!publicKey && (
          <p className="text-center text-sm text-slate-400 mt-2">
            Connect your wallet to interact
          </p>
        )}
      </div>
    </div>
  );
}
