
import React, { useState, useEffect } from 'react';
import { getCoachDailyBriefing } from '../services/geminiService';

const CoachDashboard: React.FC<any> = ({ coach, athletes, allEntries, onViewAthlete }) => {
  const [brief, setBrief] = useState('');

  useEffect(() => {
    if (athletes.length > 0) {
      getCoachDailyBriefing(athletes, allEntries).then(setBrief);
    }
  }, [athletes]);

  const copyCode = () => {
    const link = `${window.location.origin}?join=${coach.inviteCode}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied to clipboard!");
  };

  return (
    <div className="space-y-8">
      <div className="text-left mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome, {coach.firstName || 'Coach'}!</h1>
      </div>

      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Your Squad Code</h3>
          <p className="text-3xl font-black">{coach.inviteCode}</p>
        </div>
        <button onClick={copyCode} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl text-xs font-black backdrop-blur-md transition-all">
          COPY INVITE LINK
        </button>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
        <h3 className="text-xs font-black text-indigo-400 mb-4 uppercase tracking-widest">AI Performance Briefing</h3>
        <p className="text-sm leading-relaxed text-slate-300">
          {athletes.length === 0 ? "Awaiting your first athlete to join using your squad code." : (brief || 'Analyzing squad metrics...')}
        </p>
      </div>

      {athletes.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden divide-y divide-slate-50 shadow-sm">
          {athletes.map((a: any) => (
            <div key={a.id} onClick={() => onViewAthlete(a)} className="p-6 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group">
              <div>
                <p className="font-bold text-slate-900">{a.firstName} {a.lastName}</p>
                <p className="text-xs text-slate-400">{a.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity">VIEW PROFILE</span>
                <span className="text-slate-200">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoachDashboard;
