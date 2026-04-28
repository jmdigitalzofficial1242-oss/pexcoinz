import { Router } from "express";
import { PlaceOrderBody, GetMyOrdersResponse, PlaceOrderResponse } from "../lib/schemas";
import { getAuthUser } from "./auth";
import { getCurrentPrice } from "./crypto";

import Order from "../models/Order";
import Wallet from "../models/Wallet";
import { executeLedgerTransaction } from "../lib/walletService";

const router: any = Router();

router.post("/orders", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { symbol, side, type, amount, price: limitPrice, total: inputTotal } = parsed.data;

  const quoteCurrency = "USDT";
  const baseCurrency = symbol.replace(/USDT$/, "");
  const currentPrice = await getCurrentPrice(baseCurrency);

  try {
    if (type === "market") {
      if (side === "buy") {
        const spendUsdt = inputTotal ?? (amount * currentPrice);
        const receiveAmount = spendUsdt / currentPrice;

        const order = await Order.create({
          userId: auth.userId,
          symbol,
          side: "buy",
          type: "market",
          amount: receiveAmount.toFixed(8),
          price: currentPrice.toFixed(8),
          status: "open",
          filledAmount: "0",
          avgPrice: currentPrice.toFixed(8),
          total: spendUsdt.toFixed(8),
        });

        try {
          await executeLedgerTransaction([
            {
              userId: auth.userId,
              type: "trade_spend",
              currency: "USDT",
              amount: `-${spendUsdt.toFixed(8)}`,
              referenceId: `${order._id.toString()}-SPEND`,
              metadata: { orderId: order._id.toString(), symbol }
            },
            {
              userId: auth.userId,
              type: "trade_receive",
              currency: baseCurrency,
              amount: receiveAmount.toFixed(8),
              referenceId: `${order._id.toString()}-RECEIVE`,
              metadata: { orderId: order._id.toString(), symbol }
            }
          ]);

          order.status = "filled";
          order.filledAmount = receiveAmount.toFixed(8);
          await order.save();
        } catch (e: any) {
          order.status = "cancelled";
          await order.save();
          if (e.message.includes("Insufficient")) throw new Error("INSUFFICIENT_USDT");
          throw e;
        }

        res.status(201).json(PlaceOrderResponse.parse({
          id: order._id.toString() as any, // ID types managed by openapi conversion
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          amount: parseFloat(order.amount),
          price: order.price ? parseFloat(order.price) : null,
          status: order.status,
          filledAmount: parseFloat(order.filledAmount),
          avgPrice: order.avgPrice ? parseFloat(order.avgPrice) : null,
          total: order.total ? parseFloat(order.total) : null,
          createdAt: order.createdAt.toISOString(),
        }));

      } else {
        const sellAmount = amount;
        const receiveUsdt = sellAmount * currentPrice;

        const order = await Order.create({
          userId: auth.userId,
          symbol,
          side: "sell",
          type: "market",
          amount: sellAmount.toFixed(8),
          price: currentPrice.toFixed(8),
          status: "open",
          filledAmount: "0",
          avgPrice: currentPrice.toFixed(8),
          total: receiveUsdt.toFixed(8),
        });

        try {
          await executeLedgerTransaction([
            {
              userId: auth.userId,
              type: "trade_spend",
              currency: baseCurrency,
              amount: `-${sellAmount.toFixed(8)}`,
              referenceId: `${order._id.toString()}-SPEND`,
              metadata: { orderId: order._id.toString(), symbol }
            },
            {
              userId: auth.userId,
              type: "trade_receive",
              currency: "USDT",
              amount: receiveUsdt.toFixed(8),
              referenceId: `${order._id.toString()}-RECEIVE`,
              metadata: { orderId: order._id.toString(), symbol }
            }
          ]);

          order.status = "filled";
          order.filledAmount = sellAmount.toFixed(8);
          await order.save();
        } catch (e: any) {
          order.status = "cancelled";
          await order.save();
          if (e.message.includes("Insufficient")) throw new Error(`INSUFFICIENT_${baseCurrency}`);
          throw e;
        }

        res.status(201).json(PlaceOrderResponse.parse({
          id: order._id.toString() as any,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          amount: parseFloat(order.amount),
          price: order.price ? parseFloat(order.price) : null,
          status: order.status,
          filledAmount: parseFloat(order.filledAmount),
          avgPrice: order.avgPrice ? parseFloat(order.avgPrice) : null,
          total: order.total ? parseFloat(order.total) : null,
          createdAt: order.createdAt.toISOString(),
        }));
      }
    } else {
      // LIMIT OR PENDING ORDER
      const orderPrice = limitPrice ?? currentPrice;
      const total = amount * orderPrice;

      const order = await Order.create({
        userId: auth.userId,
        symbol,
        side,
        type: "limit",
        amount: amount.toFixed(8),
        price: orderPrice.toFixed(8),
        status: "open",
        filledAmount: "0",
        total: total.toFixed(8),
      });

      try {
        if (side === "buy") {
          const reserveUsdt = amount * orderPrice;
          await executeLedgerTransaction({
            userId: auth.userId,
            type: "trade_reserve",
            currency: "USDT",
            amount: `-${reserveUsdt.toFixed(8)}`,
            referenceId: `${order._id.toString()}-RESERVE`,
            metadata: { orderId: order._id.toString(), note: "Limit buy reserve" }
          });
        } else {
          await executeLedgerTransaction({
            userId: auth.userId,
            type: "trade_reserve",
            currency: baseCurrency,
            amount: `-${amount.toFixed(8)}`,
            referenceId: `${order._id.toString()}-RESERVE`,
            metadata: { orderId: order._id.toString(), note: "Limit sell reserve" }
          });
        }
      } catch (e: any) {
        order.status = "cancelled";
        await order.save();
        if (e.message.includes("Insufficient")) {
          throw new Error(side === "buy" ? "INSUFFICIENT_USDT" : `INSUFFICIENT_${baseCurrency}`);
        }
        throw e;
      }

      res.status(201).json(PlaceOrderResponse.parse({
        id: order._id.toString() as any,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        amount: parseFloat(order.amount),
        price: order.price ? parseFloat(order.price) : null,
        status: order.status,
        filledAmount: parseFloat(order.filledAmount),
        avgPrice: order.avgPrice ? parseFloat(order.avgPrice) : null,
        total: order.total ? parseFloat(order.total) : null,
        createdAt: order.createdAt.toISOString(),
      }));
    }
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: "User not found" });
    } else if (err.message === "INSUFFICIENT_USDT") {
      res.status(400).json({ error: "Insufficient USDT balance" });
    } else if (err.message?.startsWith("INSUFFICIENT_")) {
      const coin = err.message.replace("INSUFFICIENT_", "");
      res.status(400).json({ error: `Insufficient ${coin} balance` });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/orders", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const orders = await Order.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(100);

  const response = GetMyOrdersResponse.parse(orders.map(o => ({
    id: o._id.toString() as any,
    symbol: o.symbol,
    side: o.side,
    type: o.type,
    amount: parseFloat(o.amount),
    price: o.price ? parseFloat(o.price) : null,
    status: o.status,
    filledAmount: parseFloat(o.filledAmount),
    avgPrice: o.avgPrice ? parseFloat(o.avgPrice) : null,
    total: o.total ? parseFloat(o.total) : null,
    createdAt: o.createdAt.toISOString(),
  })));

  res.json(response);
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const order = await Order.findOne({ _id: targetId, userId: auth.userId });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.status !== "open") throw new Error("ORDER_NOT_OPEN");

    const baseCurrency = order.symbol.replace(/USDT$/, "");
    const orderPrice = order.price ? parseFloat(order.price) : await getCurrentPrice(baseCurrency);
    const orderAmount = parseFloat(order.amount);

    if (order.side === "buy") {
      const refundUsdt = orderAmount * orderPrice;
      await executeLedgerTransaction({
        userId: auth.userId,
        type: "trade_refund",
        currency: "USDT",
        amount: refundUsdt.toFixed(8),
        referenceId: `${order._id.toString()}-REFUND`,
        metadata: { orderId: order._id.toString() }
      });
    } else {
      await executeLedgerTransaction({
        userId: auth.userId,
        type: "trade_refund",
        currency: baseCurrency,
        amount: orderAmount.toFixed(8),
        referenceId: `${order._id.toString()}-REFUND`,
        metadata: { orderId: order._id.toString() }
      });
    }

    order.status = "cancelled";
    await order.save();
    
    if (!res.headersSent) {
      res.json({ success: true });
    }
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") {
      res.status(404).json({ error: "Order not found" });
    } else if (err.message === "ORDER_NOT_OPEN") {
      res.status(400).json({ error: "Only open orders can be cancelled" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/orders/pnl", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const orders = await Order.find({ userId: auth.userId, status: "filled" }).sort({ createdAt: 1 });
  const wallet = await Wallet.findOne({ userId: auth.userId });

  interface PnLData {
    symbol: string;
    currentAmount: number;
    avgBuyPrice: number;
    currentPrice: number;
    investedValue: number;
    currentValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    realizedPnl: number;
    totalBought: number;
    totalBuyValue: number;
  }

  const coinMap: Record<string, PnLData> = {};

  for (const order of orders) {
    const sym = order.symbol.replace(/USDT$/, "").toUpperCase();
    if (!coinMap[sym]) {
      coinMap[sym] = {
        symbol: sym, currentAmount: 0, avgBuyPrice: 0, currentPrice: 0,
        investedValue: 0, currentValue: 0, unrealizedPnl: 0,
        unrealizedPnlPct: 0, realizedPnl: 0, totalBought: 0, totalBuyValue: 0,
      };
    }

    const filled = parseFloat(order.filledAmount);
    if (isNaN(filled) || filled <= 0) continue;
    const avgPrice = order.avgPrice ? parseFloat(order.avgPrice)
      : order.price ? parseFloat(order.price) : 0;
    if (isNaN(avgPrice)) continue;

    if (order.side === "buy") {
      coinMap[sym].totalBought += filled;
      coinMap[sym].totalBuyValue += filled * avgPrice;
    } else {
      const avgCost = coinMap[sym].totalBought > 0
        ? coinMap[sym].totalBuyValue / coinMap[sym].totalBought : 0;
      coinMap[sym].realizedPnl += filled * avgPrice - filled * avgCost;
      if (coinMap[sym].totalBought > 0) {
        const sellRatio = Math.min(1, filled / coinMap[sym].totalBought);
        coinMap[sym].totalBuyValue *= 1 - sellRatio;
        coinMap[sym].totalBought = Math.max(0, coinMap[sym].totalBought - filled);
      }
    }
  }

  if (wallet) {
    const itUrl = wallet.balances.keys();
    for (const key of Array.from(itUrl)) {
      if (key !== "USDT" && coinMap[key]) {
        coinMap[key].currentAmount = parseFloat(wallet.balances.get(key)?.toString() || "0");
      }
    }
  }

  for (const [sym, data] of Object.entries(coinMap)) {
    data.currentPrice = await getCurrentPrice(sym);
    data.avgBuyPrice = data.totalBought > 0 ? data.totalBuyValue / data.totalBought : 0;
    data.investedValue = data.currentAmount * data.avgBuyPrice;
    data.currentValue = data.currentAmount * data.currentPrice;
    data.unrealizedPnl = data.currentValue - data.investedValue;
    data.unrealizedPnlPct = data.investedValue > 0
      ? ((data.currentValue - data.investedValue) / data.investedValue) * 100 : 0;
  }

  const result = Object.values(coinMap)
    .filter((d) => d.currentAmount > 0.0000001 || Math.abs(d.realizedPnl) > 0.01)
    .map(({ totalBought: _tb, totalBuyValue: _tbv, ...rest }) => rest);

  res.json(result);
});

router.get("/orders/balances", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const wallet = await Wallet.findOne({ userId: auth.userId });
  const result: { symbol: string; amount: number }[] = [];

  if (wallet) {
    const keys = Array.from(wallet.balances.keys());
    for (const key of keys) {
      if (key !== "USDT") {
        result.push({ symbol: key, amount: parseFloat(wallet.balances.get(key)?.toString() || "0") });
      }
    }
  }

  res.json(result);
});

export default router;
