import { Router } from "express";
import crypto from "crypto";
import { Decimal } from "decimal.js";
import Deposit from "../models/Deposit";
import PaymentMethod from "../models/PaymentMethod";
import User from "../models/User";
import AdminLog from "../models/AdminLog";
import { executeLedgerTransaction } from "../lib/walletService";
import { getAuthUser } from "./auth";

const router = Router();

// User: Get Deposit History
router.get("/deposits", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const deposits = await Deposit.find({ userId: auth.userId })
    .populate("methodId", "title type accountName accountNumber instructions")
    .sort({ createdAt: -1 });
  
  res.json(deposits.map(d => ({
    id: d._id.toString(),
    amount: d.amount.toString(),
    feeAmount: d.feeAmount.toString(),
    netAmount: d.netAmount.toString(),
    currency: d.currency,
    method: d.methodId, // Will contain the populated object
    referenceId: d.referenceId,
    status: d.status,
    proof: d.proof,
    createdAt: d.createdAt.toISOString()
  })));
});

// User: Make a Deposit
router.post("/deposits", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { amount, currency, methodId, txHash, proof } = req.body;
  
  if (!amount || !currency || !methodId) {
    res.status(400).json({ error: "Amount, currency, and methodId are required" });
    return;
  }

  // Verify the targeted PaymentMethod is valid and active
  const paymentMethod = await PaymentMethod.findById(methodId);
  if (!paymentMethod || !paymentMethod.isActive) {
    res.status(400).json({ error: "Invalid or inactive payment method selected." });
    return;
  }

  const amountNumber = parseFloat(amount);
  const feeAmount = parseFloat((amountNumber * 0.10).toFixed(8)); // 10% deposit fee
  const netAmount = parseFloat((amountNumber - feeAmount).toFixed(8));
  const referenceId = `DEP-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  try {
    const deposit = await Deposit.create({
      userId: auth.userId,
      amount: amountNumber.toString(),
      feeAmount: feeAmount.toString(),
      netAmount: netAmount.toString(),
      currency,
      methodId: paymentMethod._id,
      referenceId,
      txHash,
      proof,
      status: "pending",
    });

    res.status(201).json({
      id: deposit._id.toString(),
      referenceId: deposit.referenceId,
      status: deposit.status
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin: Get all deposits
router.get("/admin/deposits", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const status = req.query.status as string;
  const filter = status ? { status } : {};
  const deposits = await Deposit.find(filter)
    .populate("userId", "name email")
    .populate("methodId")
    .sort({ createdAt: -1 });
  res.json(deposits);
});

// Admin: Approve Deposit
router.post("/admin/deposits/:id/approve", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "processing" },
      { new: true }
    );

    if (!deposit) {
      const exists = await Deposit.findById(req.params.id);
      if (!exists) {
        res.status(404).json({ error: "Deposit not found" });
        return;
      }
      res.status(400).json({ error: "Deposit is not in a pending state or already being processed" });
      return;
    }

    try {
      const superAdmin = await User.findOne({ email: process.env.SUPER_ADMIN_EMAIL || "bilalarch1242@gmail.com" });
      
      const ledgerRequests: any[] = [
        {
          userId: deposit.userId.toString(),
          type: "deposit",
          amount: deposit.netAmount.toString(),
          currency: deposit.currency,
          referenceId: deposit.referenceId,
          metadata: { adminId: auth.userId, depositId: deposit._id.toString(), methodId: deposit.methodId.toString(), type: 'net_deposit' }
        }
      ];

      if (superAdmin && new Decimal(deposit.feeAmount.toString()).greaterThan(0)) {
        ledgerRequests.push({
          userId: superAdmin._id.toString(),
          type: "referral_bonus",
          amount: deposit.feeAmount.toString(),
          currency: deposit.currency,
          referenceId: `${deposit.referenceId}-COLLECT`,
          metadata: { sourceUserId: deposit.userId.toString(), depositId: deposit._id.toString(), type: 'deposit_fee_collection' }
        });
      }

      await executeLedgerTransaction(ledgerRequests);

      deposit.status = "approved";
      deposit.verifiedBy = auth.userId as any;
      deposit.adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : undefined;
      await deposit.save();

      await AdminLog.create({
        adminId: auth.userId,
        action: "approve_deposit",
        targetId: deposit._id,
        targetType: "Deposit",
        details: { amount: deposit.amount.toString(), currency: deposit.currency }
      });

      res.json({ message: "Deposit approved successfully", status: "approved" });
    } catch (error: any) {
      deposit.status = "pending";
      await deposit.save();
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reject Deposit
router.post("/admin/deposits/:id/reject", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "processing" },
      { new: true }
    );

    if (!deposit) {
      const exists = await Deposit.findById(req.params.id);
      if (!exists) {
        res.status(404).json({ error: "Deposit not found" });
        return;
      }
      res.status(400).json({ error: "Deposit is not in a pending state or already being processed" });
      return;
    }

    try {
      deposit.status = "rejected";
      deposit.verifiedBy = auth.userId as any;
      deposit.adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : "Rejected by admin";
      await deposit.save();

      await AdminLog.create({
        adminId: auth.userId,
        action: "reject_deposit",
        targetId: deposit._id,
        targetType: "Deposit",
        details: { reason: deposit.adminNote }
      });

      res.json({ message: "Deposit rejected successfully", status: "rejected" });
    } catch (error: any) {
      deposit.status = "pending";
      await deposit.save();
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
