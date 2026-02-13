
import React, { useState, useEffect } from 'react';
import { WellnessEntry, User, ReadinessStatus } from '../types';
import { storageService } from '../services/storageService';

interface DashboardProps {
  entries: WellnessEntry[];
  user: User;
  onNewReport: () => void;
  hideAction?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ entries, user, onNewReport, hideAction = false }) => {
  const [readiness, setReadiness] = useState({ status: 'READY' as ReadinessStatus, score: 0, trend: 'STABLE', acwr: 1.0 });

  useEffect(() => {
    const fetch = async () => {
      const config = await storageService.getAthleteConfig(user.id);
      const sens = await storageService.getSensitivity(user.coachId || user.id);
      setReadiness(storageService.calculateReadiness(entries, config, sens));
    };
    fetch();
  }, [entries, user]);

  const colorClass = readiness.status === 'READY' ? 'bg-indigo-600' : readiness.status === 'MINDFUL' ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center py-10">
        <div className={`w-44 h-44 rounded-full flex flex-col items-center justify-center text-white shadow-2xl ${colorClass} transition-all border-8 border-white`}>
          <span className="text-5xl font-black">{readiness.score}%</span>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Readiness</span>
        </div>
        <div className="text-center mt-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">{readiness.status}</h2>
        </div>
      </div>

      {!hideAction && (
        <button onClick={onNewReport} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl hover:bg-black transition uppercase tracking-[0.2em] text-sm">Submit Daily Entry</button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Workload (ACWR)</p>
          <p className={`text-3xl font-black ${readiness.acwr > 1.3 ? 'text-rose-500' : 'text-slate-900'}`}>{readiness.acwr.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recent Trend</p>
          <p className="text-3xl font-black text-slate-900">{readiness.trend}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
