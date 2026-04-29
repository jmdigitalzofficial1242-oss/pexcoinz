import app from "../server/src/app";
import { connectDB } from "../server/src/lib/db";

// Pre-connect to MongoDB (Mongoose will cache the connection)
connectDB().catch((err) => {
  console.error("CRITICAL: MongoDB connection failed during initialization:", err);
});

// For Vercel serverless, we can export the Express app directly.
// Vercel's @vercel/node builder will wrap it correctly and handle the lifecycle.
export default app;

