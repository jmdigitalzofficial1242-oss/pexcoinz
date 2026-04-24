import { Router } from "express";
import { getAuthUser } from "./auth";
import WalletLedger from "../models/WalletLedger";
import Wallet from "../models/Wallet";
import Deposit from "../models/Deposit";
import Withdrawal from "../models/Withdrawal";
import mongoose from "mongoose";

const router = Router();

// Get user's transaction history (combines deposits, withdrawals, and ledger)
router.get("/transactions", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const deposits = await Deposit.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(50);
  const withdrawals = await Withdrawal.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(50);

  const transactions = [
    ...deposits.map(d => ({
      id: d._id.toString(),
      type: "deposit" as const,
      amount: parseFloat(d.amount.toString()),
      currency: d.currency,
      status: d.status,
      address: null,
      note: d.txHash || null,
      createdAt: d.createdAt.toISOString(),
    })),
    ...withdrawals.map(w => ({
      id: w._id.toString(),
      type: "withdrawal" as const,
      amount: parseFloat(w.amount.toString()),
      currency: w.currency,
      status: w.status,
      address: typeof w.receivingDetails === "string" ? w.receivingDetails : null,
      note: w.txHash || null,
      createdAt: w.createdAt.toISOString(),
    })),
  ];

  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(transactions);
});

// Get user balance from wallet
router.get("/users/balance", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const wallet = await Wallet.findOne({ userId: auth.userId });
  if (!wallet) {
    res.json({ usdt: 0, btc: 0, eth: 0 });
    return;
  }

  res.json({
    usdt: parseFloat((wallet.balances.get("USDT") || mongoose.Types.Decimal128.fromString("0")).toString()),
    btc: parseFloat((wallet.balances.get("BTC") || mongoose.Types.Decimal128.fromString("0")).toString()),
    eth: parseFloat((wallet.balances.get("ETH") || mongoose.Types.Decimal128.fromString("0")).toString()),
  });
});

export default router;
