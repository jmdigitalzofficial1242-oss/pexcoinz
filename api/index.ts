import app from "../server/src/app";
import { connectDB } from "../server/src/lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // 1. Connect to DB (with caching for serverless)
    await connectDB();

    // 2. Run the Express App
    // We wrap this to catch any internal Express errors
    try {
      return app(req, res);
    } catch (expressError: any) {
      console.error("EXPRESS INTERNAL ERROR:", expressError);
      return res.status(500).json({
        error: "Express Internal Error",
        message: expressError.message,
        path: req.url
      });
    }
  } catch (error: any) {
    console.error("CRITICAL SERVERLESS ERROR:", error);
    
    // Return structured error so we can debug on production
    return res.status(500).json({ 
      error: "Critical Server Failure",
      message: error.message,
      hint: "Check MONGODB_URI and Network Access (0.0.0.0/0) in MongoDB Atlas",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};
