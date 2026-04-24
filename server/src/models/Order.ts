import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  amount: string;
  price: string | null;
  status: "open" | "filled" | "cancelled";
  filledAmount: string;
  avgPrice: string | null;
  total: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    type: { type: String, enum: ["market", "limit"], required: true },
    amount: { type: String, required: true },
    price: { type: String, default: null },
    status: { type: String, enum: ["open", "filled", "cancelled"], default: "open" },
    filledAmount: { type: String, default: "0" },
    avgPrice: { type: String, default: null },
    total: { type: String, default: null },
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);
export default Order;
