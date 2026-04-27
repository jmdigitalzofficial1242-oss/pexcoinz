import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./lib/db";
import mongoose from "mongoose";

const PORT = parseInt(process.env.PORT || "5000", 10);

// For Vercel: Connect DB on each request (Mongoose handles reuse)
const startServer = async () => {
  await connectDB();
  
  if (process.env.VERCEL) {
    console.log("✅ Running on Vercel");
    return;
  }

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 PexCoin Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api/healthz`);
  });

  const shutdown = () => {
    server.close(() => {
      mongoose.connection.close(false).then(() => process.exit(0));
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

// Export for Vercel
export default async (req: any, res: any) => {
  await connectDB();
  return app(req, res);
};

// Start normally if not on Vercel
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}

