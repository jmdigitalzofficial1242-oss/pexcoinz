import mongoose from "mongoose";
import Wallet, { IWallet } from "../models/Wallet";
import WalletLedger from "../models/WalletLedger";

export interface LedgerRequest {
  userId: string;
  type: string; // deposit, withdraw, fee, referral_bonus, admin_adjustment
  currency: string;
  amount: string; // should be safe string decimal representation
  referenceId: string;
  metadata?: any;
}

/**
 * Execute atomic ledger transactions.
 * @param request LedgerRequest details, or an array for atomic multi-currency execution (e.g. trades).
 */
export async function executeLedgerTransaction(request: LedgerRequest | LedgerRequest[]) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const requests = Array.isArray(request) ? request : [request];
    const newBalances: Record<string, string> = {};

    for (const req of requests) {
      const { userId, type, currency, amount, referenceId, metadata } = req;
      const decimalAmount = mongoose.Types.Decimal128.fromString(amount);
      const amountVal = parseFloat(amount);

      // 1. Fetch wallet with lock
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        throw new Error(`Wallet not found for userId: ${userId}`);
      }

      if (wallet.status !== "active") {
        throw new Error("Wallet is locked or frozen.");
      }

      const currentBalanceDecimal = wallet.balances.get(currency) || mongoose.Types.Decimal128.fromString("0");
      const currentBalance = parseFloat(currentBalanceDecimal.toString());
      const newBalance = currentBalance + amountVal;

      // Check for sufficient funds if it's a deduction (negative amount)
      if (amountVal < 0 && newBalance < 0) {
        throw new Error(`Insufficient ${currency} balance.`);
      }

      const newBalanceDecimal = mongoose.Types.Decimal128.fromString(newBalance.toString());

      // 2. Update wallet securely
      wallet.balances.set(currency, newBalanceDecimal);
      await wallet.save({ session });
      
      newBalances[currency] = newBalanceDecimal.toString();

      // 3. Create strictly idempotent Ledger append-only record
      // Idempotency: `referenceId` is uniquely indexed in schema, if this is a duplicate it will throw an error immediately preventing double-execution.
      await WalletLedger.create(
        [
          {
            walletId: wallet._id,
            userId,
            type,
            currency,
            amount: decimalAmount,
            beforeBalance: currentBalanceDecimal,
            afterBalance: newBalanceDecimal,
            referenceId,
            metadata,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    return { success: true, newBalances };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Validates if the user has sufficient available balance (balance - lockedBalance).
 */
export async function checkAvailableBalance(userId: string, currency: string, requiredAmount: number): Promise<boolean> {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) return false;

  const current = parseFloat((wallet.balances.get(currency) || mongoose.Types.Decimal128.fromString("0")).toString());
  const locked = parseFloat((wallet.lockedBalances.get(currency) || mongoose.Types.Decimal128.fromString("0")).toString());

  return (current - locked) >= requiredAmount;
}

/**
 * Locks a specific amount of balance for an ongoing operation (e.g. pending withdrawal).
 */
export async function lockBalance(userId: string, currency: string, amountToLock: string) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new Error("Wallet not found");

    const lockVal = parseFloat(amountToLock);
    const currentLocked = parseFloat((wallet.lockedBalances.get(currency) || mongoose.Types.Decimal128.fromString("0")).toString());
    const newLocked = currentLocked + lockVal;

    wallet.lockedBalances.set(currency, mongoose.Types.Decimal128.fromString(newLocked.toString()));
    await wallet.save({ session });

    await session.commitTransaction();
    return true;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function unlockBalance(userId: string, currency: string, amountToUnlock: string) {
  return lockBalance(userId, currency, `-${amountToUnlock}`);
}
