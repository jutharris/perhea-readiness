import React, { useState, useEffect } from 'react';
import { WellnessEntry, UserRole, PersonalityCalibration } from '../types';
import { getAthleteAnalysis } from '../services/geminiService';

const Insights: React.FC<{ entries: WellnessEntry[]; role?: UserRole; personalityCalibration?: PersonalityCalibration }> = ({ 
  entries, 
  role = 'ATHLETE',
  personalityCalibration = 'BALANCED'
}) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entries.length > 0) {
      const latestId = entries[0].id;
      
      // Get or create a session ID that persists only for the current browser session
      let sessionId = sessionStorage.getItem('ai_session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(7);
        sessionStorage.setItem('ai_session_id', sessionId);
      }
      
      // Create a unique cache key based on the latest entry, user role, personality, and session
      const cacheKey = `ai_insight_${latestId}_${role}_${personalityCalibration}_${sessionId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setAnalysis(cached);
        return;
      }

      setLoading(true);

      const personalityDirectives = {
        STOIC: "This athlete is STOIC. They under-report pain and fatigue. If they report any dip at all, prioritize it as a significant physiological event. Be highly sensitive to small changes.",
        BALANCED: "This athlete is BALANCED. Their reporting is generally reliable and proportional to their state.",
        EXPRESSIVE: "This athlete is EXPRESSIVE. They report based on current mood and 'vibes', which can be volatile. Filter for the signal within the noise; do not overreact to single-day swings."
      }[personalityCalibration] || "";

      const systemInstruction = `You are an AI Assistant Coach for a high-performance athlete. 
      Your tone is supportive, calm, and educational. 
      ${personalityDirectives}
      Do not be overly reactive to single-day dips unless the personality calibration suggests otherwise. 
      Focus on long-term trends and provide physiological context without being overly technical or prescriptive.
      Keep your response concise (2-3 sentences).
      Avoid definitive medical judgments.`;

      getAthleteAnalysis(entries, role, systemInstruction).then(res => {
        setAnalysis(res);
        localStorage.setItem(cacheKey, res);
        setLoading(false);
      });
    }
  }, [entries, role, personalityCalibration]);

  return (
    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4 relative overflow-hidden">
      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Assistant Coach</h3>
      {loading ? (
        <div className="h-12 flex items-center">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <p className="text-sm font-medium text-white/90 leading-relaxed italic">"{analysis}"</p>
      )}
    </div>
  );
};

export default Insights;
