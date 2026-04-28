import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import Wallet from "../models/Wallet";
import { RegisterBody, LoginBody, LoginResponse, GetMeResponse } from "../lib/schemas";

const router: Router = Router();

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_SECRET missing!") })() : "local_dev_only_secret");

function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token: string): { userId: string; role: string; exp: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; exp: number };
  } catch {
    return null;
  }
}

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function getAuthUser(req: { headers: { authorization?: string } }): { userId: string; role: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

function formatUserForResponse(user: any) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    phone: user.phone || null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    inviteCode: user.inviteCode,
    referredBy: user.referredBy ? user.referredBy.toString() : null,
    commissionEarned: parseFloat(user.commissionEarned || "0"),
  };
}

router.get("/auth/invite/validate", async (req, res): Promise<void> => {
  const code = (req.query.code as string)?.toUpperCase();
  if (!code) {
    res.status(400).json({ valid: false, error: "Code is required" });
    return;
  }

  const referrer = await User.findOne({ inviteCode: code }).select("name");
  if (!referrer) {
    res.status(404).json({ valid: false, error: "Invalid invitation code" });
    return;
  }

  res.json({ valid: true, referrerName: referrer.name });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? "Invalid request";
    res.status(400).json({ error: firstError });
    return;
  }

  const { email, password, name, phone, country, address, inviteCode } = parsed.data;

  const referrer = await User.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!referrer) {
    res.status(400).json({ error: "Invalid invitation code. Please get a valid invite link from an existing member." });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "This email is already registered" });
    return;
  }

  let newInviteCode: string;
  let codeExists = true;
  do {
    newInviteCode = generateInviteCode();
    const check = await User.findOne({ inviteCode: newInviteCode }).select("_id");
    codeExists = !!check;
  } while (codeExists);

  try {
    const user = await User.create({
      email: email.toLowerCase(),
      password: password, // handled by pre-save hook
      name,
      phone: phone ?? undefined,
      country: country ?? undefined,
      address: address ?? undefined,
      inviteCode: newInviteCode,
      referredBy: referrer._id,
    });

    const wallet = await Wallet.create({
      userId: user._id,
      balances: { USDT: "0", BTC: "0", ETH: "0" },
      lockedBalances: { USDT: "0", BTC: "0", ETH: "0" },
      status: "active"
    });

    const token = generateToken(user._id.toString(), user.role);
    const response = LoginResponse.parse({
      user: formatUserForResponse(user),
      token,
    });
    res.status(201).json(response);
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken(user._id.toString(), user.role);
  const response = LoginResponse.parse({
    user: formatUserForResponse(user),
    token,
  });
  res.json(response);
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await User.findById(auth.userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const response = GetMeResponse.parse(formatUserForResponse(user));
  res.json(response);
});

router.get("/auth/referrals", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const referrals = await User.find({ referredBy: auth.userId })
    .select("_id name email createdAt");

  const formatted = referrals.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    email: r.email,
    createdAt: r.createdAt.toISOString()
  }));

  res.json(formatted);
});

export { verifyToken };
export default router;
