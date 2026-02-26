import React, { useState, useEffect } from 'react';
import { WellnessEntry, UserRole } from '../types';
import { getAthleteAnalysis } from '../services/geminiService';

const Insights: React.FC<{ entries: WellnessEntry[]; role?: UserRole }> = ({ entries, role = 'ATHLETE' }) => {
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
      
      // Create a unique cache key based on the latest entry, user role, and session
      const cacheKey = `ai_insight_${latestId}_${role}_${sessionId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setAnalysis(cached);
        return;
      }

      setLoading(true);
      getAthleteAnalysis(entries, role).then(res => {
        setAnalysis(res);
        localStorage.setItem(cacheKey, res);
        setLoading(false);
      });
    }
  }, [entries, role]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Performance Auditor</h3>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap
