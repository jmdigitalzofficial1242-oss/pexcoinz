import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import cryptoRouter from "./crypto";
import walletRouter from "./wallet";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import paymentMethodsRouter from "./paymentMethods";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import openaiRouter from "./openai";
import stripeRouter from "./stripe";
import binanceRouter from "./binance";
import userRouter from "./user";
import supportRouter from "./support";
import transactionsRouter from "./transactions";

const router: any = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(cryptoRouter);
router.use(walletRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(paymentMethodsRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(openaiRouter);
router.use(stripeRouter);
router.use(binanceRouter);
router.use(userRouter);
router.use(supportRouter);
router.use(transactionsRouter);

export default router;
