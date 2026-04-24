import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWalletLedger extends Document {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: string; // deposit, withdraw, fee, referral_bonus, admin_adjustment
  currency: string;
  amount: mongoose.Types.Decimal128; // positive or negative
  beforeBalance: mongoose.Types.Decimal128;
  afterBalance: mongoose.Types.Decimal128;
  referenceId: string; // unique idempotent key
  metadata?: any;
  createdAt: Date;
}

const ledgerSchema = new Schema<IWalletLedger>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    beforeBalance: { type: Schema.Types.Decimal128, required: true },
    afterBalance: { type: Schema.Types.Decimal128, required: true },
    referenceId: { type: String, required: true, unique: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // append-only log
);

// Indexes for fast querying and auditing
ledgerSchema.index({ userId: 1, createdAt: -1 });
ledgerSchema.index({ type: 1 });

const WalletLedger: Model<IWalletLedger> = mongoose.models.WalletLedger || mongoose.model<IWalletLedger>("WalletLedger", ledgerSchema);
export default WalletLedger;
