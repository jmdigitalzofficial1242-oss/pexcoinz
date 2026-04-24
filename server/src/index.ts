import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./lib/db";

const PORT = parseInt(process.env.PORT || "5000", 10);

async function init() {
  // Connect to MongoDB
  await connectDB();
  
  console.log("✅ Database connected");

  // Start server
  app.listen(PORT, () => {
    console.log(`\n🚀 PexCoin Server running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api/healthz`);
    console.log(`🌐 App: http://localhost:${PORT}\n`);
  });
}

init().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
