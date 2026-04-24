import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPaymentMethod extends Document {
  type: string; // bank, easypaisa, jazzcash, crypto
  title: string; // e.g., "Meezan Bank - Pexcoin Official"
  accountName: string; // e.g., "Ahsan Corporation"
  accountNumber: string; // e.g., "0123456789" or crypto wallet address
  instructions?: string; // e.g., "Please include reference ID in bank notes"
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    instructions: { type: String },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const PaymentMethod: Model<IPaymentMethod> = mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);
export default PaymentMethod;
