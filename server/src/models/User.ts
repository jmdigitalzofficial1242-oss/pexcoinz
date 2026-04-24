import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  kycStatus: string;
  inviteCode: string;
  referredBy?: mongoose.Types.ObjectId;
  paymentPassword?: string;
  country?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    role: { type: String, required: true, default: "user" },
    status: { type: String, required: true, default: "active" }, // active, suspended
    kycStatus: { type: String, required: true, default: "unverified" }, // unverified, pending, verified, rejected
    inviteCode: { type: String, required: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    paymentPassword: { type: String },
    country: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export default User;
