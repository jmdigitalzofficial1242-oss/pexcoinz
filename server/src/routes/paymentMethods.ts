import { Router } from "express";
import PaymentMethod from "../models/PaymentMethod";
import { getAuthUser } from "./auth";

const router: any = Router();

// User: Get all active payment methods
router.get("/payment-methods", async (req, res): Promise<void> => {
  const methods = await PaymentMethod.find({ isActive: true }).select("-createdBy -createdAt -updatedAt");
  res.json(methods);
});

// Admin: Get all payment methods (including inactive)
router.get("/admin/payment-methods", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const methods = await PaymentMethod.find().sort({ createdAt: -1 });
  res.json(methods);
});

// Admin: Create a new payment method
router.post("/admin/payment-methods", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { type, title, accountName, accountNumber, instructions } = req.body;

  if (!type || !title || !accountName || !accountNumber) {
    res.status(400).json({ error: "Type, title, accountName, and accountNumber are required" });
    return;
  }

  try {
    const method = await PaymentMethod.create({
      type,
      title,
      accountName,
      accountNumber,
      instructions,
      isActive: true,
      createdBy: auth.userId,
    });

    res.status(201).json(method);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Payment Method (e.g. disable/enable or change details)
router.patch("/admin/payment-methods/:id", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) {
      res.status(404).json({ error: "Payment method not found" });
      return;
    }

    const { type, title, accountName, accountNumber, instructions, isActive } = req.body;

    if (type !== undefined) method.type = type;
    if (title !== undefined) method.title = title;
    if (accountName !== undefined) method.accountName = accountName;
    if (accountNumber !== undefined) method.accountNumber = accountNumber;
    if (instructions !== undefined) method.instructions = instructions;
    if (isActive !== undefined) method.isActive = isActive;

    await method.save();
    res.json(method);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
