import React, { useState, useEffect } from 'react';
import { getCoachDailyBriefing } from '../services/geminiService';

const CoachDashboard: React.FC<any> = ({ athletes, allEntries, onViewAthlete }) => {
  const [brief, setBrief] = useState('');

  useEffect(() => {
    getCoachDailyBriefing(athletes, allEntries).then(setBrief);
  }, [athletes]);

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
        <h3 className="text-xs font-black text-indigo-400 mb-4 uppercase tracking-widest">AI Briefing</h3>
        <p className="text-sm leading-relaxed">{brief || 'Analyzing squad...'}</p>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {athletes.map((a: any) => (
          <div key={a.id} onClick={() => onViewAthlete(a)} className="p-6 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
            <div>
              <p className="font-bold">{a.firstName} {a.lastName}</p>
              <p className="text-xs text-slate-400">{a.email}</p>
            </div>
            <span className="text-indigo-600 font-black text-xs">VIEW →</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachDashboard;
