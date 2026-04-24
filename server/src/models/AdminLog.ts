import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: string; // e.g., 'approve_deposit', 'reject_withdrawal'
  targetId: mongoose.Types.ObjectId; // id of the deposit, withdrawal, or user
  targetType: string; // 'Deposit', 'Withdrawal', 'User'
  details?: any;
  createdAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetType: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AdminLog: Model<IAdminLog> = mongoose.models.AdminLog || mongoose.model<IAdminLog>("AdminLog", adminLogSchema);
export default AdminLog;
