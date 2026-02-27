
import React, { useMemo } from 'react';
import { WellnessEntry } from '../types';
import { storageService } from '../services/storageService';
import Insights from './Insights';

const Dashboard: React.FC<any> = ({ entries, user, onNewReport, onSubmaxTest, hideAction = false }) => {
  const regime = storageService.calculateRegime(entries, user.personalityCalibration);

  const statusMap = {
    'BUILD': { label: 'BUILD REGIME', color: 'from-emerald-500/20 to-emerald-600/20', text: 'text-emerald-600', border: 'border-emerald-100', sub: 'Optimal Resilience & High Capacity' },
    'ADAPT': { label: 'ADAPT REGIME', color: 'from-sky-400/20 to-indigo-500/20', text: 'text-sky-600', border: 'border-sky-100', sub: 'Productive Load Absorption' },
    'RESTORATION': { label: 'RESTORATION', color: 'from-amber-400/20 to-orange-500/20', text: 'text-amber-600', border: 'border-amber-100', sub: 'System Pivot: Prioritize Support' },
    'CAUTION': { label: 'CAUTION', color: 'from-rose-500/20 to-red-600/20', text: 'text-rose-600', border: 'border-rose-100', sub: 'High Turbulence: Regime Change Detected' }
  };

  const currentStatus = statusMap[regime.status as keyof typeof statusMap] || statusMap.ADAPT;

  const focusArea = useMemo(() => {
    if (entries.length === 0) return null;
    const l = entries[0];
    const metrics = [
      { name: 'Sleep Quality', val: l.sleepQuality, tip: 'Try a 10-min screen-free wind down tonight.' },
      { name: 'Energy', val: l.energy, tip: 'Focus on hydration and steady-state movement.' },
      { name: 'Soreness', val: l.soreness, tip: 'Light mobility or contrast water therapy recommended.' },
      { name: 'Stress', val: l.stress, tip: 'Consider a 5-minute focused breathing session.' }
    ];
    return metrics.sort((a, b) => a.val - b.val)[0];
  }, [entries]);

  return (
    <div className={`space-y-8 text-center pb-12 min-h-screen transition-all duration-1000 bg-gradient-to-b ${currentStatus.color}`}>
      <div className="text-left px-4 pt-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Daily Briefing</h1>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Welcome back, {user.firstName || 'Athlete'}</p>
      </div>

      <div className="px-4">
        <Insights entries={entries} personalityCalibration={user.personalityCalibration} />
      </div>

      <div className="py-20 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 blur-3xl">
          <div className={`w-96 h-32 rounded-full ${currentStatus.text.replace('text', 'bg')}`}></div>
        </div>
        <div className="relative z-10 space-y-4">
          <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${currentStatus.text} opacity-70`}>
            {regime.reason}
          </span>
          <h2 className={`text-7xl font-black italic uppercase tracking-tighter leading-none ${currentStatus.text}`}>
            {currentStatus.label}
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
            {currentStatus.sub}
          </p>
        </div>
      </div>

      {focusArea && regime.status !== 'BUILD' && (
        <div className="px-4">
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] inline-flex flex-col items-start border border-white/20 shadow-sm max-w-sm text-left">
            <span className="uppercase block text-[10px] font-black text-slate-400 tracking-widest mb-2">Coach's Focus</span>
            <p className="text-sm font-bold text-slate-700 leading-relaxed">
              {focusArea.tip}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white/40 p-8 rounded-[2.5rem] mx-4 border border-white/20 text-left space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Audit Summary</h3>
        {entries.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Sleep</p>
              <p className="text-sm font-black text-slate-700">{entries[0].sleepHours}h ({entries[0].sleepQuality}/7)</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Stress</p>
              <p className="text-sm font-black text-slate-700">{entries[0].stress}/7</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Energy</p>
              <p className="text-sm font-black text-slate-700">{entries[0].energy}/7</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
              <p className="text-sm font-black text-slate-700">{entries[0].feelingSick ? 'Sick' : (entries[0].injured ? 'Injured' : 'Healthy')}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-slate-400 italic">No data logged for this period.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
