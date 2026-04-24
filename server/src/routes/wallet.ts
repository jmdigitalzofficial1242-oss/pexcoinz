import { Router } from "express";
import Wallet from "../models/Wallet";
import WalletLedger from "../models/WalletLedger";
import { getAuthUser } from "./auth";

const router = Router();

// Get Wallet Balances
router.get("/wallet", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const wallet = await Wallet.findOne({ userId: auth.userId });
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.json({
    status: wallet.status,
    balances: Object.fromEntries(wallet.balances),
    lockedBalances: Object.fromEntries(wallet.lockedBalances),
  });
});

// Get Ledger Statement
router.get("/wallet/ledger", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const ledger = await WalletLedger.find({ userId: auth.userId })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(ledger.map(l => ({
    id: l._id.toString(),
    type: l.type,
    currency: l.currency,
    amount: l.amount.toString(),
    beforeBalance: l.beforeBalance.toString(),
    afterBalance: l.afterBalance.toString(),
    referenceId: l.referenceId,
    createdAt: l.createdAt.toISOString(),
    metadata: l.metadata,
  })));
});

export default router;
