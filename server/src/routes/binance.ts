import { Router } from "express";
import { createHmac } from "node:crypto";
import { getAuthUser } from "./auth";

const TESTNET_BASE = "https://testnet.binance.vision/api/v3";
const router = Router();

function getBinanceKeys() {
  const apiKey = process.env.BINANCE_TESTNET_API_KEY;
  const secret = process.env.BINANCE_TESTNET_SECRET;
  return { apiKey, secret, configured: !!(apiKey && secret) };
}

function signQuery(params: Record<string, string>, secret: string): string {
  const qs = new URLSearchParams(params).toString();
  const sig = createHmac("sha256", secret).update(qs).digest("hex");
  return `${qs}&signature=${sig}`;
}

async function binanceFetch(
  path: string,
  params: Record<string, string> = {},
  method = "GET",
  apiKey: string,
  secret: string
): Promise<any> {
  const signed = signQuery({ ...params, timestamp: Date.now().toString() }, secret);
  const url = method === "POST"
    ? `${TESTNET_BASE}${path}`
    : `${TESTNET_BASE}${path}?${signed}`;

  const headers: Record<string, string> = { "X-MBX-APIKEY": apiKey };
  const opts: RequestInit = { method, headers, signal: AbortSignal.timeout(8000) };

  if (method === "POST") {
    opts.body = signed;
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).msg || `Binance error ${res.status}`);
  return data;
}

router.get("/binance/status", (_req, res) => {
  const { configured } = getBinanceKeys();
  res.json({
    configured,
    testnet: true,
    message: configured
      ? "Binance testnet connected"
      : "Set BINANCE_TESTNET_API_KEY and BINANCE_TESTNET_SECRET to enable live testnet trading",
  });
});

router.get("/binance/balance", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { apiKey, secret, configured } = getBinanceKeys();
  if (!configured) {
    res.status(503).json({ error: "Binance testnet not configured", configured: false });
    return;
  }

  try {
    const data = await binanceFetch("/account", {}, "GET", apiKey!, secret!);
    const nonZero = (data.balances as any[]).filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );
    res.json({ balances: nonZero, configured: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/binance/order", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { apiKey, secret, configured } = getBinanceKeys();
  if (!configured) {
    res.status(503).json({ error: "Binance testnet not configured", configured: false });
    return;
  }

  const { symbol, side, type, quantity, price } = req.body;
  const params: Record<string, string> = {
    symbol: String(symbol).replace(/[^A-Z0-9]/gi, "").toUpperCase(),
    side: String(side).toUpperCase(),
    type: String(type).toUpperCase(),
    quantity: parseFloat(quantity).toFixed(8),
  };

  if (params.type === "LIMIT") {
    if (!price) { res.status(400).json({ error: "Price required for limit orders" }); return; }
    params.price = parseFloat(price).toFixed(8);
    params.timeInForce = "GTC";
  }

  try {
    const data = await binanceFetch("/order", params, "POST", apiKey!, secret!);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/binance/orders", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { apiKey, secret, configured } = getBinanceKeys();
  if (!configured) {
    res.status(503).json({ error: "Binance testnet not configured", configured: false });
    return;
  }

  try {
    const sym = req.query.symbol as string | undefined;
    const params: Record<string, string> = {};
    if (sym) params.symbol = sym.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const data = await binanceFetch("/openOrders", params, "GET", apiKey!, secret!);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
