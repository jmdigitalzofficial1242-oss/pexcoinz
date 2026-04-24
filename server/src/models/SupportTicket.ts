import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISupportTicket extends Document {
  userId: string;
  subject: string;
  status: string; // open, answered, closed
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: { type: String, required: true },
    subject: { type: String, required: true, default: "Support Request" },
    status: { type: String, required: true, default: "open" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

supportTicketSchema.index({ userId: 1 });

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>("SupportTicket", supportTicketSchema);
export default SupportTicket;
