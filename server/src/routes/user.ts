import { Router } from "express";
import { getAuthUser } from "./auth";
import User from "../models/User";
import crypto from "crypto";

const router = Router();

function hashPaymentPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? "pexcoin_salt";
  return crypto.createHash("sha256").update(password + salt + "_payment").digest("hex");
}

router.patch("/user/profile", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { name, phone, country, address } = req.body;
  try {
    const user = await User.findById(auth.userId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (name && typeof name === "string" && name.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone?.trim() || undefined;
    if (country !== undefined) user.country = country?.trim() || undefined;
    if (address !== undefined) user.address = address?.trim() || undefined;

    await user.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/user/payment-password", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length !== 6 || !/^\d{6}$/.test(password)) {
    res.status(400).json({ error: "Payment password must be exactly 6 digits" });
    return;
  }

  const hashed = hashPaymentPassword(password);
  try {
    await User.findByIdAndUpdate(auth.userId, { paymentPassword: hashed });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to set payment password" });
  }
});

router.post("/user/payment-password/verify", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { password } = req.body;
  if (!password) { res.status(400).json({ error: "Password required" }); return; }

  try {
    const user = await User.findById(auth.userId).select("paymentPassword");
    if (!user || !user.paymentPassword) {
      res.json({ valid: false, noPassword: true });
      return;
    }
    const hashed = hashPaymentPassword(String(password));
    res.json({ valid: hashed === user.paymentPassword });
  } catch {
    res.json({ valid: false, error: "Failed to verify" });
  }
});

router.get("/user/payment-password/status", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const user = await User.findById(auth.userId).select("paymentPassword");
    res.json({ hasPaymentPassword: !!(user?.paymentPassword) });
  } catch {
    res.json({ hasPaymentPassword: false });
  }
});

export default router;
