import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: mongoose.Types.Decimal128;
  feeAmount: mongoose.Types.Decimal128; // Usually 5%
  netAmount: mongoose.Types.Decimal128; // amount - fee
  currency: string;
  receivingMethod: string; // e.g. 'Easypaisa', 'Bank'
  receivingDetails: string; // e.g. 'Account 1234, Name: Pexcoin'
  referenceId: string;
  txHash?: string; // from external network after completion
  status: string; // pending, approved, completed, rejected
  processedBy?: mongoose.Types.ObjectId;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    feeAmount: { type: Schema.Types.Decimal128, required: true },
    netAmount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    receivingMethod: { type: String, required: true },
    receivingDetails: { type: String, required: true },
    referenceId: { type: String, required: true, unique: true },
    txHash: { type: String },
    status: { type: String, required: true, default: "pending" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adminNote: { type: String },
  },
  { timestamps: true }
);

const Withdrawal: Model<IWithdrawal> = mongoose.models.Withdrawal || mongoose.model<IWithdrawal>("Withdrawal", withdrawalSchema);
export default Withdrawal;
