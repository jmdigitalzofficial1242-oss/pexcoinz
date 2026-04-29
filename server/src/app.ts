import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: any = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Logging
app.use(morgan("dev"));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
// We mount at both /api and root to handle different Vercel routing behaviors
app.use("/api", router);
app.use("/", router);



// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" 
      ? "Internal Server Error" 
      : err.message
  });
});

// Serve frontend static files in production (Only if not on Vercel, which handles this natively)
if (!process.env.VERCEL) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "API endpoint not found" });
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}


export default app;
