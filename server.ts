import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import process from 'process';
import dotenv from 'dotenv';

dotenv.config();

// Supabase initialization
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("Environment Keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('API')));
console.log("Supabase Config Check:", { 
  hasUrl: !!supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl?.substring(0, 10)
});

const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined') 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging and custom header
  app.use((req, res, next) => {
    res.setHeader('X-Nerve-Center', 'active');
    console.log(`[App] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // API Routes - MUST BE BEFORE VITE MIDDLEWARE
  const apiRouter = express.Router();

  app.use("/api", apiRouter);

  apiRouter.use((req, res, next) => {
    console.log(`[API Router] ${req.method} ${req.path}`);
    next();
  });

  apiRouter.get("/health", (req, res) => {
    console.log("Health check hit");
    res.json({ 
      status: "ok", 
      supabase: !!supabase,
      env: process.env.NODE_ENV
    });
  });

  apiRouter.use((req, res) => {
    console.log(`[API Router] 404 - ${req.method} ${req.path}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite integration
  const isProd = process.env.NODE_ENV === "production";
  
  if (!isProd) {
    console.log("Starting in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode");
    // In production, we serve the static files from dist
    // Note: AI Studio might still be in dev mode, so we handle both
    app.use(express.static("dist"));
    app.get("*", (req, res, next) => {
      // If it's an API route that wasn't matched, don't serve index.html
      if (req.path.startsWith('/api/')) return next();
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
