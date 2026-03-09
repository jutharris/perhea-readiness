import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", supabase: !!supabase });
  });

  app.get("/api/admin/nerve-center", async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

    try {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Fetch data in parallel
      const [usersRes, entriesRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('wellness_entries').select('*').gte('iso_date', thirtyDaysAgo.toISOString())
      ]);

      if (usersRes.error) throw usersRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const allUsers = usersRes.data || [];
      const entries = entriesRes.data || [];
      const athletes = allUsers.filter(u => u.role === 'ATHLETE');
      const athleteIds = new Set(athletes.map(a => a.id));

      // 1. Day-7 Return Rate
      const activeInLast7 = athletes.filter(u => u.last_active_at && new Date(u.last_active_at) >= sevenDaysAgo);
      const day7ReturnRate = athletes.length > 0 ? (activeInLast7.length / athletes.length) * 100 : 0;

      // 2. Friction Index
      const entriesInLast7 = entries.filter(e => athleteIds.has(e.user_id) && new Date(e.iso_date) >= sevenDaysAgo);
      const frictionIndex = activeInLast7.length > 0 ? (entriesInLast7.length / (activeInLast7.length * 7)) * 100 : 0;

      // 3. Stickiness (DAU/MAU)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(now.getDate() - 1);
      const dau = athletes.filter(u => u.last_active_at && new Date(u.last_active_at) >= oneDayAgo).length;
      const mau = athletes.filter(u => u.last_active_at && new Date(u.last_active_at) >= thirtyDaysAgo).length;
      const stickinessRatio = mau > 0 ? (dau / mau) * 100 : 0;

      // 4. Growth
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
          birthDate: d.birth_date,
          trainingFocus: d.training_focus || d.focus,
          personalityCalibration: d.personality_calibration || d.personality || d.reporting_style,
          isPremium: !!d.is_premium,
          isFrozen: !!d.is_frozen,
          queuedAlert: d.queued_alert,
          lastActiveAt: d.last_active_at,
          createdAt: d.created_at
        })),
        entries: entries.map(e => ({
          id: e.id,
          userId: e.user_id,
          isoDate: e.iso_date,
          rpe: e.rpe,
          stress: e.stress,
          sleep: e.sleep,
          energy: e.energy,
          soreness: e.soreness,
          notes: e.notes
        }))
      });
    } catch (err: any) {
      console.error("Nerve Center API Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
