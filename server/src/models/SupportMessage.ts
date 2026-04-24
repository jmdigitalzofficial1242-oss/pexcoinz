import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISupportMessage extends Document {
  ticketId: mongoose.Types.ObjectId;
  senderId: string | null;
  senderRole: string; // user, admin
  content: string;
  isRead: boolean;
  createdAt: Date;
}

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true },
    senderId: { type: String, default: null },
    senderRole: { type: String, required: true, default: "user" },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

const SupportMessage: Model<ISupportMessage> =
  mongoose.models.SupportMessage || mongoose.model<ISupportMessage>("SupportMessage", supportMessageSchema);
export default SupportMessage;
