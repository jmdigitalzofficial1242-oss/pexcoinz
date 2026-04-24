import mongoose, { Document, Model, Schema } from "mongoose";

export interface IConversation extends Document {
  userId: string;
  title: string;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

conversationSchema.index({ userId: 1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>("Conversation", conversationSchema);
export default Conversation;
