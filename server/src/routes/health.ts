import { Router } from "express";
import { HealthCheckResponse } from "../lib/schemas";

const router: any = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
