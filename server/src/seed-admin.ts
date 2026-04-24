import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "./models/User";
import Wallet from "./models/Wallet";
import { connectDB } from "./lib/db";
import crypto from "crypto";

const SUPER_ADMIN = {
  email: "bilalarch1242@gmail.com",
  password: "bilalarch1242",
  name: "Super Administrator",
  inviteCode: "ADMIN001",
  role: "super_admin",
  usdtBalance: "50000",
  btcBalance: "1.5",
  ethBalance: "10",
};

const DEMO_CLIENT = {
  email: "client@pexcoin.com",
  password: "client123",
  name: "Demo Client",
  inviteCode: "CLIENT01",
  role: "user",
  usdtBalance: "5000",
  btcBalance: "0.05",
  ethBalance: "0.5",
};

async function upsertUser(
  userData: typeof SUPER_ADMIN | typeof DEMO_CLIENT,
  referredById?: mongoose.Types.ObjectId
) {
  let existing = await User.findOne({ email: userData.email });

  if (existing) {
    existing.password = userData.password;
    existing.name = userData.name;
    existing.role = userData.role;
    existing.status = "active";
    existing.inviteCode = userData.inviteCode;
    await existing.save();

    const wallet = await Wallet.findOne({ userId: existing._id });
    if (wallet) {
      wallet.balances.set("USDT", mongoose.Types.Decimal128.fromString(userData.usdtBalance));
      wallet.balances.set("BTC", mongoose.Types.Decimal128.fromString(userData.btcBalance));
      wallet.balances.set("ETH", mongoose.Types.Decimal128.fromString(userData.ethBalance));
      await wallet.save();
    }
    
    console.log(`  ✓ ${userData.role} account updated: ${userData.email}`);
    return existing;
  }

  let inviteCode = userData.inviteCode;
  const codeConflict = await User.findOne({ inviteCode });
  if (codeConflict) {
    inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  }

  const created = await User.create({
    email: userData.email,
    password: userData.password,
    name: userData.name,
    role: userData.role,
    status: "active",
    kycStatus: "verified",
    inviteCode,
    referredBy: referredById,
  });

  await Wallet.create({
    userId: created._id,
    balances: {
      USDT: mongoose.Types.Decimal128.fromString(userData.usdtBalance),
      BTC: mongoose.Types.Decimal128.fromString(userData.btcBalance),
      ETH: mongoose.Types.Decimal128.fromString(userData.ethBalance)
    },
    lockedBalances: { USDT: "0", BTC: "0", ETH: "0" },
    status: "active"
  });

  console.log(`  ✓ ${userData.role} account & wallet created: ${userData.email}`);
  return created;
}

async function seedAll() {
  await connectDB();
  console.log("\n=== PexCoin Account Seeding (MongoDB) ===");

  const admin = await upsertUser(SUPER_ADMIN);
  await upsertUser(DEMO_CLIENT, admin._id as mongoose.Types.ObjectId);

  console.log("\n=== Seed Complete ===");
  console.log("\n📋 Login Credentials:");
  console.log("─────────────────────────────────────────");
  console.log("🔑 SUPER ADMIN:");
  console.log(`   Email    : ${SUPER_ADMIN.email}`);
  console.log(`   Password : ${SUPER_ADMIN.password}`);
  console.log(`   Panel    : /admin`);
  console.log(`   Invite   : ${SUPER_ADMIN.inviteCode}`);
  console.log("─────────────────────────────────────────");
  console.log("👤 CLIENT / USER:");
  console.log(`   Email    : ${DEMO_CLIENT.email}`);
  console.log(`   Password : ${DEMO_CLIENT.password}`);
  console.log(`   Login    : /login`);
  console.log("─────────────────────────────────────────\n");
}

seedAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
