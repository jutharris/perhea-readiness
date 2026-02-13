
import React, { useState, useEffect } from 'react';
import { WellnessEntry, UserRole } from '../types';
import { getAthleteAnalysis } from '../services/geminiService';

const Insights: React.FC<{ entries: WellnessEntry[]; role?: UserRole }> = ({ entries, role = 'ATHLETE' }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entries.length > 0) {
      setLoading(true);
      getAthleteAnalysis(entries, role).then(res => {
        setAnalysis(res);
        setLoading(false);
      });
    }
  }, [entries, role]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Performance Auditor</h3>
      {loading ? (
        <div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{analysis}</p>
      )}
    </div>
  );
};

export default Insights;
