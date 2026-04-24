import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdminSetting extends Document {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSettingSchema = new Schema<IAdminSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

const AdminSetting: Model<IAdminSetting> = mongoose.models.AdminSetting || mongoose.model<IAdminSetting>("AdminSetting", adminSettingSchema);
export default AdminSetting;
