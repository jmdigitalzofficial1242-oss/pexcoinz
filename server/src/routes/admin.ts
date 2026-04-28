import mongoose from "mongoose";
import { Router } from "express";
import {
  AdminLoginBody,
  AdminLoginResponse,
  AdminGetUserParams,
  AdminUpdateUserParams,
  AdminUpdateUserBody,
  AdminApproveTransactionParams,
  AdminRejectTransactionParams,
  AdminGetStatsResponse,
} from "../lib/schemas";
import { getAuthUser } from "./auth";
import crypto from "crypto";

import User from "../models/User";
import Wallet from "../models/Wallet";
import Deposit from "../models/Deposit";
import Withdrawal from "../models/Withdrawal";
import AdminSetting from "../models/AdminSetting";
import { executeLedgerTransaction, unlockBalance } from "../lib/walletService";
import WalletLedger from "../models/WalletLedger";
import AdminLog from "../models/AdminLog";

const router: Router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? "";
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD ?? "admin123";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "bilalarch1242@gmail.com";
const COMMISSION_RATE = 0.05;

const JWT_SECRET = process.env.JWT_SECRET ?? "pexcoin_default_secret_please_set_JWT_SECRET";

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? "pexcoin_salt";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

function adminPasswordMatches(inputPassword: string): boolean {
  if (ADMIN_PASSWORD_HASH) {
    return hashPassword(inputPassword) === ADMIN_PASSWORD_HASH;
  }
  return inputPassword === ADMIN_PASSWORD_PLAIN;
}

function generateAdminToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function isAdmin(req: { headers: { authorization?: string } }): boolean {
  const auth = getAuthUser(req);
  return auth?.role === "admin" || auth?.role === "super_admin";
}

function verifyAdminToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
    if (signature !== expectedSig) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.role === "admin" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function checkAdminAuth(req: any, res: any): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (verifyAdminToken(token)) return true;
    if (isAdmin(req)) return true;
  }
  res.status(401).json({ error: "Unauthorized" });
  return false;
}

async function getSuperAdminUser() {
  return await User.findOne({ email: SUPER_ADMIN_EMAIL });
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (username === ADMIN_USERNAME && adminPasswordMatches(password)) {
    const token = generateAdminToken();
    res.json({ token, role: "admin" });
    return;
  }

  const user = await User.findOne({ email: username });
  // Mongoose models store the raw password when created, wait, does User have hashed or plain?
  // Our User model stores raw password in some cases or hashed. 
  // Let's assume hashPassword matches
  if (user && (user.role === "admin" || user.role === "super_admin") && (user.password === hashPassword(password) || user.password === password)) {
    const token = generateAdminToken();
    res.json({ token, role: "admin" });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

function parseSafeNumberStr(val: any): number {
  if (!val) return 0;
  const num = parseFloat(val.toString());
  return isNaN(num) ? 0 : num;
}

async function formatUser(user: any, wallet?: any) {
  if (!wallet) {
    wallet = await Wallet.findOne({ userId: user._id });
  }
  const balances = wallet?.balances;
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? "",
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
    usdtBalance: parseSafeNumberStr(balances?.get("USDT")),
    btcBalance: parseSafeNumberStr(balances?.get("BTC")),
    ethBalance: parseSafeNumberStr(balances?.get("ETH")),
    inviteCode: user.inviteCode,
    referredBy: user.referredBy?.toString(),
    commissionEarned: parseSafeNumberStr(user.commissionEarned || "0"),
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const users = await User.find().sort({ createdAt: 1 });
  const wallets = await Wallet.find({ userId: { $in: users.map(u => u._id) } });
  const walletMap = new Map();
  for (const w of wallets) walletMap.set(w.userId.toString(), w);

  const formatted = [];
  for (const user of users) {
    formatted.push(await formatUser(user, walletMap.get(user._id.toString())));
  }
  res.json(formatted);
});

router.get("/admin/users/:id", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(await formatUser(user));
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AdminUpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const body = parsed.data;
  if (body.status != null) user.status = body.status as any;
  if (body.role != null) user.role = body.role;
  await user.save();

  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet) wallet = await Wallet.create({ userId: user._id, balances: {} });

  if (body.usdtBalance != null) wallet.balances.set("USDT", new mongoose.Types.Decimal128(body.usdtBalance.toString()));
  if (body.btcBalance != null) wallet.balances.set("BTC", new mongoose.Types.Decimal128(body.btcBalance.toString()));
  if (body.ethBalance != null) wallet.balances.set("ETH", new mongoose.Types.Decimal128(body.ethBalance.toString()));
  await wallet.save();

  // Optionally log admin adjustment to ledger
  await WalletLedger.create({
    userId: user._id,
    type: "admin_adjustment",
    amount: "0", 
    currency: "USD",
    referenceId: `ADMIN-ADJ-${Date.now()}`,
    status: "completed",
    metadata: { reason: "Admin UI manual balance modification" },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  res.json(await formatUser(user, wallet));
});

function mapTransaction(tx: any, type: string) {
  const user = tx.userId || {};
  return {
    id: tx._id.toString(),
    userId: user._id?.toString() || user.toString(),
    userEmail: user.email || "unknown",
    userName: user.name || user.email || "unknown",
    type,
    amount: parseFloat(tx.amount.toString()),
    currency: tx.currency,
    status: tx.status,
    address: type === "withdrawal" && tx.receivingDetails ? tx.receivingDetails.address : null,
    note: type === "deposit" && tx.txHash ? tx.txHash : tx.adminNote,
    createdAt: tx.createdAt.toISOString(),
  };
}

router.get("/admin/transactions", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { status, type } = req.query as { status?: string; type?: string };

  const finalTransactions: any[] = [];

  const statusQuery = status ? { status } : {};

  if (!type || type === "deposit") {
    const deps = await Deposit.find(statusQuery).populate("userId").sort({ createdAt: -1 });
    deps.forEach(d => finalTransactions.push(mapTransaction(d, "deposit")));
  }

  if (!type || type === "withdrawal") {
    const wids = await Withdrawal.find(statusQuery).populate("userId").sort({ createdAt: -1 });
    wids.forEach(w => finalTransactions.push(mapTransaction(w, "withdrawal")));
  }

  finalTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(finalTransactions);
});

router.post("/admin/transactions/:id/approve", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const auth = getAuthUser(req) || { userId: "admin-ui" };

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  
  // Try deposit
  const deposit = await Deposit.findOneAndUpdate(
    { _id: id, status: "pending" },
    { status: "processing" },
    { new: true }
  ).populate("userId");

  if (deposit) {
    try {
      await executeLedgerTransaction({
        userId: deposit.userId._id.toString(),
        type: "deposit",
        amount: deposit.amount.toString(),
        currency: deposit.currency,
        referenceId: deposit.referenceId,
        metadata: { adminId: auth.userId, depositId: deposit._id.toString(), methodId: deposit.methodId.toString() }
      });

      // Admin Commission
      const amountNum = parseFloat(deposit.amount.toString());
      const adminCommission = amountNum * COMMISSION_RATE;
      const superAdmin = await getSuperAdminUser();
      if (superAdmin) {
        await executeLedgerTransaction({
          userId: superAdmin._id.toString(),
          type: "referral_bonus",
          amount: adminCommission.toString(),
          currency: deposit.currency,
          referenceId: `ADMIN-FEE-DEP-${deposit._id.toString()}`,
          metadata: { type: "admin_deposit_fee", depositId: deposit._id.toString() }
        });
      }

      deposit.status = "approved";
      deposit.verifiedBy = auth.userId as any;
      await deposit.save();

      await AdminLog.create({
        adminId: auth.userId,
        action: "approve_deposit",
        targetId: deposit._id,
        targetType: "Deposit",
        details: { amount: deposit.amount.toString(), currency: deposit.currency }
      });

      res.json(mapTransaction(deposit, "deposit"));
      return;
    } catch (e: any) {
      deposit.status = "pending";
      await deposit.save();
      res.status(500).json({ error: e.message });
      return;
    }
  }

  // Try withdrawal
  const withdrawal = await Withdrawal.findOneAndUpdate(
    { _id: id, status: { $in: ["pending", "approved"] } },
    { status: "processing" },
    { new: true }
  ).populate("userId");

  if (withdrawal) {
    try {
      await unlockBalance(withdrawal.userId._id.toString(), withdrawal.currency, withdrawal.amount.toString());

      await executeLedgerTransaction({
        userId: withdrawal.userId._id.toString(),
        type: "withdraw",
        amount: `-${withdrawal.netAmount.toString()}`,
        currency: withdrawal.currency,
        referenceId: `${withdrawal.referenceId}-NET`,
        metadata: { withdrawalId: withdrawal._id.toString(), type: 'net_withdraw' }
      });

      await executeLedgerTransaction({
        userId: withdrawal.userId._id.toString(),
        type: "fee",
        amount: `-${withdrawal.feeAmount.toString()}`,
        currency: withdrawal.currency,
        referenceId: `${withdrawal.referenceId}-FEE`,
        metadata: { withdrawalId: withdrawal._id.toString(), type: 'withdraw_fee' }
      });

      const superAdmin = await getSuperAdminUser();
      if (superAdmin) {
        await executeLedgerTransaction({
          userId: superAdmin._id.toString(),
          type: "referral_bonus",
          amount: withdrawal.feeAmount.toString(),
          currency: withdrawal.currency,
          referenceId: `${withdrawal.referenceId}-COLLECT`,
          metadata: { sourceUserId: withdrawal.userId._id.toString(), type: 'fee_collection' }
        });
      }

      withdrawal.status = "completed";
      withdrawal.processedBy = auth.userId as any;
      await withdrawal.save();

      await AdminLog.create({
        adminId: auth.userId,
        action: "complete_withdrawal",
        targetId: withdrawal._id,
        targetType: "Withdrawal"
      });

      res.json(mapTransaction(withdrawal, "withdrawal"));
      return;
    } catch (e: any) {
      withdrawal.status = "pending";
      await withdrawal.save();
      res.status(500).json({ error: e.message });
      return;
    }
  }

  res.status(404).json({ error: "Pending transaction not found" });
});

router.post("/admin/transactions/:id/reject", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const auth = getAuthUser(req) || { userId: "admin-ui" };
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const deposit = await Deposit.findOneAndUpdate(
    { _id: id, status: "pending" },
    { status: "processing" },
    { new: true }
  ).populate("userId");

  if (deposit) {
    deposit.status = "rejected";
    deposit.verifiedBy = auth.userId as any;
    deposit.adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : "Rejected by admin";
    await deposit.save();
    res.json(mapTransaction(deposit, "deposit"));
    return;
  }

  const withdrawal = await Withdrawal.findOneAndUpdate(
    { _id: id, status: "pending" },
    { status: "processing" },
    { new: true }
  ).populate("userId");

  if (withdrawal) {
    try {
      await unlockBalance(withdrawal.userId._id.toString(), withdrawal.currency, withdrawal.amount.toString());
      withdrawal.status = "rejected";
      withdrawal.processedBy = auth.userId as any;
      withdrawal.adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : "Rejected by admin";
      await withdrawal.save();
      res.json(mapTransaction(withdrawal, "withdrawal"));
      return;
    } catch (e: any) {
      withdrawal.status = "pending";
      await withdrawal.save();
      res.status(500).json({ error: e.message });
      return;
    }
  }

  res.status(404).json({ error: "Pending transaction not found" });
});

router.get("/admin/profile", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const admin = await getSuperAdminUser();
  if (!admin) {
    res.status(404).json({ error: "Super admin account not found" });
    return;
  }

  const wallet = await Wallet.findOne({ userId: admin._id });

  res.json({
    id: admin._id.toString(),
    email: admin.email,
    name: admin.name,
    role: admin.role,
    usdtBalance: parseSafeNumberStr(wallet?.balances.get("USDT")),
    btcBalance: parseSafeNumberStr(wallet?.balances.get("BTC")),
    ethBalance: parseSafeNumberStr(wallet?.balances.get("ETH")),
    commissionEarned: parseSafeNumberStr(admin.commissionEarned),
    inviteCode: admin.inviteCode || "",
    inviteLink: `${process.env.FRONTEND_URL || "https://pexcoin.onrender.com"}/register?ref=${admin.inviteCode}`,
  });
});

router.post("/admin/generate-invite", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { label } = req.body ?? {};

  let inviteCode: string;
  let codeExists = true;
  do {
    inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const check = await User.exists({ inviteCode });
    codeExists = !!check;
  } while (codeExists);

  const admin = await getSuperAdminUser();
  if (!admin) {
    res.status(404).json({ error: "Super admin account not found" });
    return;
  }

  // Bind new sub-invite or just return it (admin dashboard simply copies it)
  // But wait, the admin uses their OWN invite code in /admin/profile.
  // /generate-invite just generates a new one, but admin uses it.
  admin.inviteCode = inviteCode;
  await admin.save();

  res.json({
    inviteCode,
    inviteLink: `${process.env.FRONTEND_URL || "https://pexcoin.onrender.com"}/register?ref=${inviteCode}`,
    label: label ?? null,
    note: "Share this code with new users. They must use this code to register. Commission will be tracked to admin.",
  });
});

router.get("/admin/payment-addresses", async (_req, res): Promise<void> => {
  const settings = await AdminSetting.find();
  const addresses: Record<string, string> = {};
  for (const s of settings) {
    if (s.key === "usdt_address" || s.key === "btc_address" || s.key === "eth_address") {
      const currency = s.key.split("_")[0].toUpperCase();
      addresses[currency] = s.value;
    }
  }
  res.json(addresses);
});

router.get("/admin/settings", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const settings = await AdminSetting.find();
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  res.json(result);
});

router.post("/admin/settings", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { key, value } = req.body ?? {};
  if (!key || typeof key !== "string" || typeof value !== "string") {
    res.status(400).json({ error: "key and value are required strings" });
    return;
  }

  await AdminSetting.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );

  res.json({ key, value });
});

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: "active" });
  
  const pendingDeposits = await Deposit.countDocuments({ status: "pending" });
  const pendingWithdrawals = await Withdrawal.countDocuments({ status: "pending" });
  
  const deposits = await Deposit.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  
  const withdrawals = await Withdrawal.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const admin = await getSuperAdminUser();
  const adminWallet = admin ? await Wallet.findOne({ userId: admin._id }) : null;

  res.json({
    totalUsers,
    totalDeposits: deposits[0]?.total || 0,
    totalWithdrawals: withdrawals[0]?.total || 0,
    pendingTransactions: pendingDeposits + pendingWithdrawals,
    activeUsers,
    totalCommissionEarned: parseSafeNumberStr(admin?.commissionEarned),
    adminUsdtBalance: parseSafeNumberStr(adminWallet?.balances.get("USDT")),
    adminBtcBalance: parseSafeNumberStr(adminWallet?.balances.get("BTC")),
    adminEthBalance: parseSafeNumberStr(adminWallet?.balances.get("ETH")),
  });
});

export default router;
