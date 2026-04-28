import { Router } from "express";
import { getAuthUser } from "./auth";
import User from "../models/User";

const router: Router = Router();

// Stripe is optional - these routes return empty data when not configured
router.get("/stripe/products", async (_req, res): Promise<void> => {
  res.json({ data: [] });
});

router.post("/stripe/checkout", async (req, res): Promise<void> => {
  res.status(503).json({ error: "Stripe payments are not configured. Contact admin for deposit methods." });
});

export default router;
