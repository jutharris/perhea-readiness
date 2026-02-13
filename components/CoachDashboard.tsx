
import React, { useState, useEffect } from 'react';
import { User, WellnessEntry } from '../types';
import { storageService } from '../services/storageService';
import { getCoachDailyBriefing } from '../services/geminiService';

const CoachDashboard: React.FC<{ athletes: User[]; allEntries: WellnessEntry[]; onViewAthlete: (a: User) => void }> = ({ athletes, allEntries, onViewAthlete }) => {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(true);
  const coach = storageService.getCurrentUser();

  useEffect(() => {
    if (coach) {
      getCoachDailyBriefing(athletes, allEntries, coach.id).then(res => {
        setBriefing(res);
        setLoading(false);
      });
    }
  }, [athletes, allEntries]);

  return (
    <div className="space-y-8">
      <section className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl space-y-6">
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Squad Auditor</h3>
        {loading ? <div className="h-10 animate-pulse bg-slate-800 rounded-lg" /> : <p className="text-lg font-medium leading-relaxed">{briefing}</p>}
      </section>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {athletes.map(a => (
          <div key={a.id} onClick={() => onViewAthlete(a)} className="p-6 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">{a.name.charAt(0)}</div>
              <div><p className="font-bold text-slate-900">{a.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{a.email}</p></div>
            </div>
            <div className="text-right font-black text-indigo-600 text-xs">VIEW HISTORY →</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachDashboard;
