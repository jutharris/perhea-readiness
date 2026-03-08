# PerHea Readiness: Where Analog Meets AI

![PerHea Banner](https://placehold.co/1200x400/4f46e5/ffffff?text=PerHea+Readiness)

**PerHea Readiness** is an elite athlete performance monitoring platform that bridges the gap between raw biological data and actionable coaching intelligence. Built on the proven **Hooper-Mackinnon** sports science model and powered by **Gemini 3.1 Pro AI**, PerHea transforms subjective wellness markers into a definitive "Regime" for daily training.

---

## 💎 The Investor's Vision: Scalable Human Performance

### The Problem
In the $50B+ sports tech market, coaches are drowning in data but starving for insight. Wearables provide "what" happened, but they fail to explain "why" or "what next." This gap leads to overtraining, injury, and suboptimal performance.

### The Solution: The "Analog" Advantage
PerHea doesn't just look at heart rate; it looks at the *human*. By capturing the "analog" signals—mood, stress, soreness, and perceived effort—and processing them through a sophisticated AI reasoning engine, PerHea provides a high-fidelity map of an athlete's internal state.

### Scalability & ROI
- **Global DNA (Creator Lab):** A single head coach can define their philosophy once, and the AI will enforce that "Soul Document" across thousands of athletes instantly.
- **Retention by Design:** The "7-Day Baseline" protocol creates immediate user buy-in, turning a simple form into a powerful predictive tool.
- **Low Friction, High Value:** No expensive hardware required. PerHea works with the tools athletes already have (their phones and their bodies).

---

## 🛠️ The CTO's Brief: Architecture & Intelligence

PerHea is built for speed, data integrity, and deep reasoning.

### The Intelligence Stack
- **Gemini 3.1 Pro reasoning:** We don't use LLMs for "chat." We use them as a **Reasoning Engine**. The AI analyzes 30-day trends, cross-references them with "Bio Laws," and outputs clinical coaching adjustments.
- **Bio Laws (Intelligence Packet):** Every athlete has a persistent "Intelligence Packet" in Supabase. This is the AI's evolving memory of that athlete's unique biological response to stress.
- **Global DNA (Soul Document):** System-wide coaching logic is stored in a `global_config` table, allowing for real-time, hot-swappable AI personalities and decision-making frameworks.

### The Technical Stack
- **Frontend:** React 18 + Vite + TypeScript.
- **Styling:** Tailwind CSS (Utility-first, high-performance "Crafted" UI).
- **Backend:** Supabase (PostgreSQL, Auth, Real-time).
- **Performance Testing:** Custom `.FIT` file parser for Submaximal heart rate analysis.
- **Animation:** Motion (Framer Motion) for immersive, high-end UX.

---

## 🚀 Key Features

### 1. The Daily Wellness Audit
A high-friction/high-value protocol that captures 7 key markers (Energy, Stress, Sleep, Soreness, etc.) using the Hooper-Mackinnon logic.

### 2. Submax Lab
Upload `.FIT` files from Garmin/Wahoo to analyze submaximal heart rate efficiency. The AI detects "Aerobic Decoupling" and alerts coaches before an athlete burns out.

### 3. Creator Lab (Admin Only)
The "Nerve Center" for the platform. Admins can rewrite the "Soul Document" to change the AI's coaching philosophy globally in seconds.

### 4. Coach/Athlete Nerve Center
Real-time communication, automated alerts, and trend visualization. Coaches can manage an entire "Squad" from a single dashboard.

---

## 📦 Setup & Deployment

### Environment Variables
Create a `.env` file with the following:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_key
```

### Database Setup
Run the `setup.sql` script in your Supabase SQL Editor to initialize:
- `profiles` (with Intelligence Packets)
- `wellness_entries`
- `global_config` (The Soul Document)
- `submax_tests`
- `messages`

### Installation
```bash
npm install
npm run dev
```

---

## 📜 The Philosophy
PerHea is built on the belief that **data is noise without context.** We provide the context. We provide the "Soul" to the machine.

**Where analog meets AI.**
