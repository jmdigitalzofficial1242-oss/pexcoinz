import { Router } from "express";
import crypto from "crypto";
import Withdrawal from "../models/Withdrawal";
import User from "../models/User";
import AdminLog from "../models/AdminLog";
import { executeLedgerTransaction, checkAvailableBalance, lockBalance, unlockBalance } from "../lib/walletService";
import { getAuthUser } from "./auth";

const router = Router();

// User: Get Withdrawal History
router.get("/withdrawals", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const withdrawals = await Withdrawal.find({ userId: auth.userId }).sort({ createdAt: -1 });
  
  res.json(withdrawals.map(w => ({
    id: w._id.toString(),
    amount: w.amount.toString(),
    feeAmount: w.feeAmount.toString(),
    netAmount: w.netAmount.toString(),
    currency: w.currency,
    receivingMethod: w.receivingMethod,
    receivingDetails: w.receivingDetails,
    referenceId: w.referenceId,
    status: w.status,
    txHash: w.txHash,
    createdAt: w.createdAt.toISOString()
  })));
});

// User: Make a Withdrawal Request
router.post("/withdrawals", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { amount, currency, receivingMethod, receivingDetails, paymentPassword } = req.body;
  if (!amount || !currency || !receivingMethod || !receivingDetails) {
    res.status(400).json({ error: "Amount, currency, receivingMethod, and receivingDetails are required" });
    return;
  }

  const user = await User.findById(auth.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.kycStatus !== "verified") {
    res.status(403).json({ error: "KYC verification is required before withdrawing." });
    return;
  }

  if (user.paymentPassword && user.paymentPassword !== paymentPassword) {
    res.status(401).json({ error: "Invalid payment password" });
    return;
  }

  const amountNumber = parseFloat(amount);
  if (isNaN(amountNumber) || amountNumber <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const hasBalance = await checkAvailableBalance(auth.userId, currency, amountNumber);
  if (!hasBalance) {
    res.status(400).json({ error: "Insufficient available balance" });
    return;
  }

  const feeAmount = parseFloat((amountNumber * 0.05).toFixed(8));
  const netAmount = parseFloat((amountNumber - feeAmount).toFixed(8));
  const referenceId = `WDL-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  try {
    // Lock the requested balance purely based on the amount the user is trying to withdraw
    await lockBalance(auth.userId, currency, amountNumber.toString());

    const withdrawal = await Withdrawal.create({
      userId: auth.userId,
      amount: amountNumber.toString(),
      feeAmount: feeAmount.toString(),
      netAmount: netAmount.toString(),
      currency,
      receivingMethod,
      receivingDetails,
      referenceId,
      status: "pending",
    });

    res.status(201).json({
      id: withdrawal._id.toString(),
      referenceId: withdrawal.referenceId,
      status: withdrawal.status
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all withdrawals
router.get("/admin/withdrawals", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const status = req.query.status as string;
  const filter = status ? { status } : {};
  const withdrawals = await Withdrawal.find(filter).populate("userId", "name email").sort({ createdAt: -1 });
  res.json(withdrawals);
});

// Admin: Complete Withdrawal
router.post("/admin/withdrawals/:id/complete", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["pending", "approved"] } },
      { status: "processing" },
      { new: true }
    );

    if (!withdrawal) {
      const exists = await Withdrawal.findById(req.params.id);
      if (!exists) {
        res.status(404).json({ error: "Withdrawal not found" });
        return;
      }
      res.status(400).json({ error: "Withdrawal must be pending or approved to complete, or is already processing" });
      return;
    }

    try {
      // 1. Release the lock since we are executing it
      await unlockBalance(withdrawal.userId.toString(), withdrawal.currency, withdrawal.amount.toString());

      // 2. Perform Atomic deduction (Net Amount being sent out)
      await executeLedgerTransaction({
        userId: withdrawal.userId.toString(),
        type: "withdraw",
        amount: `-${withdrawal.netAmount.toString()}`,
        currency: withdrawal.currency,
        referenceId: `${withdrawal.referenceId}-NET`,
        metadata: { withdrawalId: withdrawal._id.toString(), type: 'net_withdraw' }
      });

      // 3. Perform atomic deduction for Fee Commission (5%)
      await executeLedgerTransaction({
        userId: withdrawal.userId.toString(),
        type: "fee",
        amount: `-${withdrawal.feeAmount.toString()}`,
        currency: withdrawal.currency,
        referenceId: `${withdrawal.referenceId}-FEE`,
        metadata: { withdrawalId: withdrawal._id.toString(), type: 'withdraw_fee' }
      });

      // 4. Update the Super Admin's wallet to collect the fee
      const superAdmin = await User.findOne({ email: process.env.SUPER_ADMIN_EMAIL || "bilalarch1242@gmail.com" });
      if (superAdmin) {
        await executeLedgerTransaction({
          userId: superAdmin._id.toString(),
          type: "referral_bonus", // Internal tracking alias for Treasury fee collection
          amount: withdrawal.feeAmount.toString(),
          currency: withdrawal.currency,
          referenceId: `${withdrawal.referenceId}-COLLECT`,
          metadata: { sourceUserId: withdrawal.userId.toString(), type: 'fee_collection' }
        });
      }

      withdrawal.status = "completed";
      withdrawal.processedBy = auth.userId as any;
      if (req.body.txHash) withdrawal.txHash = req.body.txHash;
      await withdrawal.save();

      await AdminLog.create({
        adminId: auth.userId,
        action: "complete_withdrawal",
        targetId: withdrawal._id,
        targetType: "Withdrawal",
        details: { txHash: withdrawal.txHash, receivingMethod: withdrawal.receivingMethod }
      });

      res.json({ message: "Withdrawal completed successfully", status: "completed" });
    } catch (error: any) {
      // Restore status to pending if execution failed so it can be retried or debugged
      // Note: unlockBalance and executeLedger are internal logic, if executeLedger fails after unlock, balance is bugged.
      // Ideally executeLedger and unlock are in one transaction. 
      withdrawal.status = "pending";
      await withdrawal.save();
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reject Withdrawal
router.post("/admin/withdrawals/:id/reject", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "processing" },
      { new: true }
    );

    if (!withdrawal) {
      const exists = await Withdrawal.findById(req.params.id);
      if (!exists) {
        res.status(404).json({ error: "Withdrawal not found" });
        return;
      }
      res.status(400).json({ error: "Withdrawal is not in a pending state or is already processing" });
      return;
    }

    try {
      // Since we locked it earlier, refund/unlock it
      await unlockBalance(withdrawal.userId.toString(), withdrawal.currency, withdrawal.amount.toString());

      withdrawal.status = "rejected";
      withdrawal.processedBy = auth.userId as any;
      withdrawal.adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : "Rejected by admin";
      await withdrawal.save();

      await AdminLog.create({
        adminId: auth.userId,
        action: "reject_withdrawal",
        targetId: withdrawal._id,
        targetType: "Withdrawal",
        details: { reason: withdrawal.adminNote }
      });

      res.json({ message: "Withdrawal rejected successfully. Funds unlocked.", status: "rejected" });
    } catch (error: any) {
      withdrawal.status = "pending";
      await withdrawal.save();
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
