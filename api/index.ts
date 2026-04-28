import app from "../server/src/app";
import { connectDB } from "../server/src/lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // 1. Connect to DB
    await connectDB();

    // 2. Run the Express App
    return app(req, res);
  } catch (error: any) {
    console.error("CRITICAL SERVER ERROR:", error);
    
    // Return the actual error message so we can fix it!
    res.status(500).json({ 
      error: "Server Crash Details",
      details: error.message,
      stack: error.stack?.split("\n")[0] // Just the first line of stack
    });
  }
};
