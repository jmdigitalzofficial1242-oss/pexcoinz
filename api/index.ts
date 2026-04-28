import app from "../server/src/app";
import { connectDB } from "../server/src/lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  console.log(`[Vercel API] Request: ${req.method} ${req.url}`);
  
  try {
    // Ensure DB is connected
    console.log("[Vercel API] Connecting to Database...");
    await connectDB();
    console.log("[Vercel API] DB Connected.");

    // Hand off to Express app
    return app(req, res);
  } catch (error: any) {
    console.error("[Vercel API Error]:", error);
    
    // Detailed error message in logs, but generic for user
    res.status(500).json({ 
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? error.message : "Server side crash"
    });
  }
};
