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
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // API Routes - MUST BE BEFORE VITE MIDDLEWARE
  app.get("/api/health", (req, res) => {
    console.log("Health check hit");
    res.json({ 
      status: "ok", 
      supabase: !!supabase,
      env: process.env.NODE_ENV
    });
  });

  app.get("/api/admin/nerve-center", async (req, res) => {
    console.log("Nerve Center API hit");
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // Create a request-specific Supabase client using the user's token
    // This ensures RLS policies are correctly applied based on the user's role
    const userSupabase = (supabaseUrl && supabaseAnonKey && token)
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        })
      : supabase;

    if (!userSupabase) {
      console.error("Nerve Center Error: Supabase not initialized");
      return res.status(500).json({ 
        error: "Supabase not configured on server",
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey,
          hasToken: !!token
        }
      });
    }

    try {
      const { data: { user } } = await userSupabase.auth.getUser();
      console.log("Authenticated User:", user?.email, user?.id);

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      console.log("Fetching from Supabase with user context...");
      const [usersRes, entriesRes] = await Promise.all([
        userSupabase.from('profiles').select('*'),
        userSupabase.from('wellness_entries').select('*').gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      if (usersRes.error) {
        console.error("Supabase Profiles Error:", usersRes.error);
        return res.status(500).json({ error: "Supabase Profiles Error", details: usersRes.error });
      }
      if (entriesRes.error) {
        console.error("Supabase Entries Error:", entriesRes.error);
        return res.status(500).json({ error: "Supabase Entries Error", details: entriesRes.error });
      }

      const allUsers = usersRes.data || [];
      const entries = entriesRes.data || [];
      console.log(`Fetched ${allUsers.length} users and ${entries.length} entries`);

      const athletes = allUsers.filter(u => u.role === 'ATHLETE');
      const athleteIds = new Set(athletes.map(a => a.id));

      // Metrics calculation
      const activeInLast7 = athletes.filter(u => u.last_active_at && new Date(u.last_active_at) >= sevenDaysAgo);
      const day7ReturnRate = athletes.length > 0 ? (activeInLast7.length / athletes.length) * 100 : 0;
      const entriesInLast7 = entries.filter(e => athleteIds.has(e.user_id) && new Date(e.created_at) >= sevenDaysAgo);
      const frictionIndex = activeInLast7.length > 0 ? (entriesInLast7.length / (activeInLast7.length * 7)) * 100 : 0;

      const oneDayAgo = new Date();
      oneDayAgo.setDate(now.getDate() - 1);
      const dau = athletes.filter(u => u.last_active_at && new Date(u.last_active_at) >= oneDayAgo).length;
      const mau = athletes.filter(u => u.last_active_at && new Date(u.last_active_at) >= thirtyDaysAgo).length;
      const stickinessRatio = mau > 0 ? (dau / mau) * 100 : 0;

      const getNewUsersCount = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - days);
        return allUsers.filter(u => u.created_at && new Date(u.created_at) >= cutoff).length;
      };

      res.json({
        metrics: {
          day7ReturnRate,
          frictionIndex,
          aiInsightROI: 45,
          submissionConsistency: 85,
          totalUsers: allUsers.length,
          newUsers: {
            day: getNewUsersCount(1),
            week: getNewUsersCount(7),
            month: getNewUsersCount(30),
            year: getNewUsersCount(365)
          },
          users30Days: allUsers.filter(u => u.created_at && (now.getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24) >= 30).length,
          inactiveUsers7Days: athletes.filter(u => !u.last_active_at || new Date(u.last_active_at) < sevenDaysAgo).length,
          stickinessRatio,
          viralCoefficient: 1.2,
          timeToInsight: 4.2
        },
        users: allUsers.map(d => ({
          id: d.id,
          email: d.email,
          firstName: d.first_name,
          lastName: d.last_name,
          role: d.role,
          coachId: d.coach_id,
          trainingFocus: d.training_focus || d.focus,
          personalityCalibration: d.personality_calibration || d.personality || d.reporting_style,
          isPremium: !!d.is_premium,
          isFrozen: !!d.is_frozen,
          lastActiveAt: d.last_active_at,
          createdAt: d.created_at
        })),
        entries: entries.map(e => ({
          id: e.id,
          userId: e.user_id,
          isoDate: e.created_at,
          rpe: e.rpe,
          stress: e.stress,
          sleep: e.sleep,
          energy: e.energy,
          soreness: e.soreness
        }))
      });
    } catch (err: any) {
      console.error("Nerve Center Error:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
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
