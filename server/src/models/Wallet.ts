import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balances: Map<string, mongoose.Types.Decimal128>;
  lockedBalances: Map<string, mongoose.Types.Decimal128>;
  status: string; // active, frozen
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balances: {
      type: Map,
      of: Schema.Types.Decimal128,
      default: { USDT: "0", BTC: "0", ETH: "0" },
    },
    lockedBalances: {
      type: Map,
      of: Schema.Types.Decimal128,
      default: { USDT: "0", BTC: "0", ETH: "0" }, // specific for pending withdrawals
    },
    status: { type: String, required: true, default: "active" },
  },
  { timestamps: true }
);

const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", walletSchema);
export default Wallet;
