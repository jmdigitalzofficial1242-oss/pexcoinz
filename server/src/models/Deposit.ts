import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId;
  amount: mongoose.Types.Decimal128;
  currency: string;
  methodId: mongoose.Types.ObjectId; // Reference to PaymentMethod
  feeAmount: mongoose.Types.Decimal128;
  netAmount: mongoose.Types.Decimal128;
  referenceId: string; // generated internally for identifying
  txHash?: string; // from external network
  proof?: string; // image url
  status: string; // pending, approved, rejected
  verifiedBy?: mongoose.Types.ObjectId;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const depositSchema = new Schema<IDeposit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    methodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
    feeAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    netAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    referenceId: { type: String, required: true, unique: true },
    txHash: { type: String },
    proof: { type: String },
    status: { type: String, required: true, default: "pending" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adminNote: { type: String },
  },
  { timestamps: true }
);

const Deposit: Model<IDeposit> = mongoose.models.Deposit || mongoose.model<IDeposit>("Deposit", depositSchema);
export default Deposit;
