import mongoose from "mongoose";
import { Decimal } from "decimal.js";
import Wallet, { IWallet } from "../models/Wallet";
import WalletLedger from "../models/WalletLedger";

// Set precision for decimal.js to 20 decimals (enough for most crypto)
Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN });

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
export async function executeLedgerTransaction(request: LedgerRequest | LedgerRequest[], externalSession?: mongoose.ClientSession) {
  const session = externalSession || await mongoose.startSession();
  if (!externalSession) session.startTransaction();
  
  try {
    const requests = Array.isArray(request) ? request : [request];
    const newBalances: Record<string, string> = {};

    for (const req of requests) {
      const { userId, type, currency, amount, referenceId, metadata } = req;
      const decimalAmount = new Decimal(amount);
      
      // 1. Fetch wallet with lock
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        throw new Error(`Wallet not found for userId: ${userId}`);
      }

      if (wallet.status !== "active") {
        throw new Error("Wallet is locked or frozen.");
      }

      const currentBalanceDecimal = new Decimal(wallet.balances.get(currency)?.toString() || "0");
      const newBalance = currentBalanceDecimal.plus(decimalAmount);

      // Check for sufficient funds if it's a deduction (negative amount)
      if (decimalAmount.isNegative() && newBalance.isNegative()) {
        throw new Error(`Insufficient ${currency} balance.`);
      }

      const newBalanceStr = newBalance.toString();

      // 2. Update wallet securely
      wallet.balances.set(currency, mongoose.Types.Decimal128.fromString(newBalanceStr));
      await wallet.save({ session });
      
      newBalances[currency] = newBalanceStr;

      // 3. Create strictly idempotent Ledger append-only record
      await WalletLedger.create(
        [
          {
            walletId: wallet._id,
            userId,
            type,
            currency,
            amount: mongoose.Types.Decimal128.fromString(decimalAmount.toString()),
            beforeBalance: mongoose.Types.Decimal128.fromString(currentBalanceDecimal.toString()),
            afterBalance: mongoose.Types.Decimal128.fromString(newBalanceStr),
            referenceId,
            metadata,
          },
        ],
        { session }
      );
    }

    if (!externalSession) await session.commitTransaction();
    return { success: true, newBalances };
  } catch (error) {
    if (!externalSession) await session.abortTransaction();
    throw error;
  } finally {
    if (!externalSession) session.endSession();
  }
}

/**
 * Validates if the user has sufficient available balance (balance - lockedBalance).
 */
export async function checkAvailableBalance(userId: string, currency: string, requiredAmount: string): Promise<boolean> {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) return false;

  const current = new Decimal(wallet.balances.get(currency)?.toString() || "0");
  const locked = new Decimal(wallet.lockedBalances.get(currency)?.toString() || "0");
  const required = new Decimal(requiredAmount);

  return current.minus(locked).greaterThanOrEqualTo(required);
}

/**
 * Atomic Check and Lock balance for an ongoing operation (e.g. pending withdrawal).
 * Prevents race conditions by doing both in a single transaction.
 */
export async function checkAndLockBalance(userId: string, currency: string, amountToLock: string) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new Error("Wallet not found");

    const amount = new Decimal(amountToLock);
    const currentBalance = new Decimal(wallet.balances.get(currency)?.toString() || "0");
    const currentLocked = new Decimal(wallet.lockedBalances.get(currency)?.toString() || "0");
    const available = currentBalance.minus(currentLocked);

    if (available.lessThan(amount)) {
      throw new Error(`Insufficient ${currency} available balance.`);
    }

    const newLocked = currentLocked.plus(amount);
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

/**
 * Locks a specific amount of balance. 
 * Warning: Use checkAndLockBalance instead if you need to verify availability atomically.
 */
export async function lockBalance(userId: string, currency: string, amountToLock: string) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new Error("Wallet not found");

    const lockVal = new Decimal(amountToLock);
    const currentLocked = new Decimal(wallet.lockedBalances.get(currency)?.toString() || "0");
    const newLocked = currentLocked.plus(lockVal);

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
  const amount = new Decimal(amountToUnlock).negated().toString();
  return lockBalance(userId, currency, amount);
}

/**
 * Atomically completes a withdrawal by unlocking the balance and recording the ledger entries in one transaction.
 */
export async function completeWithdrawalBatch(params: {
  userId: string;
  currency: string;
  totalAmount: string;
  netAmount: string;
  feeAmount: string;
  referenceId: string;
  withdrawalId: string;
  superAdminId?: string;
}) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, currency, totalAmount, netAmount, feeAmount, referenceId, withdrawalId, superAdminId } = params;
    
    // 1. Fetch and Lock Wallet
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new Error("Wallet not found");

    // 2. Unlock the requested amount
    const currentLocked = new Decimal(wallet.lockedBalances.get(currency)?.toString() || "0");
    const newLocked = currentLocked.minus(new Decimal(totalAmount));
    if (newLocked.isNegative()) throw new Error("Insufficient locked balance to unlock.");
    
    wallet.lockedBalances.set(currency, mongoose.Types.Decimal128.fromString(newLocked.toString()));

    // 3. Deduct total amount from balance (Net + Fee)
    const currentBalance = new Decimal(wallet.balances.get(currency)?.toString() || "0");
    const newBalance = currentBalance.minus(new Decimal(totalAmount));
    if (newBalance.isNegative()) throw new Error("Insufficient balance.");

    wallet.balances.set(currency, mongoose.Types.Decimal128.fromString(newBalance.toString()));
    await wallet.save({ session });

    // 4. Create Ledger Entries
    // Net withdrawal
    await WalletLedger.create([{
      walletId: wallet._id,
      userId,
      type: "withdraw",
      currency,
      amount: mongoose.Types.Decimal128.fromString(`-${netAmount}`),
      beforeBalance: mongoose.Types.Decimal128.fromString(currentBalance.toString()),
      afterBalance: mongoose.Types.Decimal128.fromString(currentBalance.minus(new Decimal(netAmount)).toString()),
      referenceId: `${referenceId}-NET`,
      metadata: { withdrawalId, type: 'net_withdraw' }
    }], { session });

    // Fee deduction
    await WalletLedger.create([{
      walletId: wallet._id,
      userId,
      type: "fee",
      currency,
      amount: mongoose.Types.Decimal128.fromString(`-${feeAmount}`),
      beforeBalance: mongoose.Types.Decimal128.fromString(currentBalance.minus(new Decimal(netAmount)).toString()),
      afterBalance: mongoose.Types.Decimal128.fromString(newBalance.toString()),
      referenceId: `${referenceId}-FEE`,
      metadata: { withdrawalId, type: 'withdraw_fee' }
    }], { session });

    // 5. Transfer fee to Super Admin if provided
    if (superAdminId && new Decimal(feeAmount).greaterThan(0)) {
      const adminWallet = await Wallet.findOne({ userId: superAdminId }).session(session);
      if (adminWallet) {
        const adminBefore = new Decimal(adminWallet.balances.get(currency)?.toString() || "0");
        const adminAfter = adminBefore.plus(new Decimal(feeAmount));
        
        adminWallet.balances.set(currency, mongoose.Types.Decimal128.fromString(adminAfter.toString()));
        await adminWallet.save({ session });

        await WalletLedger.create([{
          walletId: adminWallet._id,
          userId: superAdminId,
          type: "referral_bonus",
          currency,
          amount: mongoose.Types.Decimal128.fromString(feeAmount),
          beforeBalance: mongoose.Types.Decimal128.fromString(adminBefore.toString()),
          afterBalance: mongoose.Types.Decimal128.fromString(adminAfter.toString()),
          referenceId: `${referenceId}-COLLECT`,
          metadata: { sourceUserId: userId, type: 'fee_collection' }
        }], { session });
      }
    }

    await session.commitTransaction();
    return { success: true, newBalance: newBalance.toString() };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}


