import React, { useMemo } from 'react';
import { WellnessEntry } from '../types';
import { storageService } from '../services/storageService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard: React.FC<any> = ({ entries, user, onNewReport, onSubmaxTest, hideAction = false }) => {
  const readiness = storageService.calculateReadiness(entries);
  
  const statusMap = {
    'READY': { label: 'PRIME STATE', color: 'bg-indigo-600', sub: 'High Capacity for Work' },
    'MINDFUL': { label: 'ADAPTIVE LOADING', color: 'bg-amber-400', sub: 'Body is Responding & Growing' },
    'RECOVERY': { label: 'RESTORATION FOCUS', color: 'bg-rose-500', sub: 'Prioritize Physical Support' }
  };

  const currentStatus = statusMap[readiness.status as keyof typeof statusMap] || statusMap.READY;

  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    const sortedEntries = [...entries].reverse();
    return sortedEntries.map((_, index, array) => {
      const subset = array.slice(0, index + 1);
      const getRollingAvg = (days: number) => {
        const slice = subset.slice(-days);
        const sum = slice.reduce((acc, curr) => acc + storageService.calculateReadiness([curr]).score, 0);
        return Math.round(sum / slice.length);
      };
      const date = new Date(array[index].isoDate);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        readiness: storageService.calculateReadiness([array[index]]).score,
        avg7: getRollingAvg(7),
        avg28: getRollingAvg(28)
      };
    }).slice(-28);
  }, [entries]);

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
    <div className="space-y-6 text-center pb-12">
      <div className="text-left mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome, {user.firstName || 'Athlete'}!</h1>
      </div>

      <div className="flex justify-center py-6">
        <div className={`w-44 h-44 rounded-full flex flex-col items-center justify-center text-white ${currentStatus.color} shadow-2xl transition-colors duration-700`}>
          <span className="text-4xl font-black">{readiness.score}%</span>
          <span className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Efficiency</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-4xl font-black italic uppercase text-slate-900 tracking-tight">{currentStatus.label}</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{currentStatus.sub}</p>
      </div>

      {focusArea && readiness.score < 80 && (
        <div className="bg-indigo-50/50 p-4 rounded-2xl inline-flex items-center gap-3 border border-indigo-100/50">
          <span className="text-indigo-600 text-lg">✨</span>
          <p className="text-[11px] font-bold text-indigo-700 text-left leading-tight">
            <span className="uppercase block opacity-60">Focus Suggestion</span>
            {focusArea.tip}
          </p>
        </div>
      )}

      {!hideAction && (
        <div className="flex flex-col gap-3">
          <button onClick={onNewReport} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all">Submit Daily Audit</button>
          <button onClick={onSubmaxTest} className="w-full py-4 bg-indigo-50 text-indigo-600 font-black rounded-[2rem] border border-indigo-100 hover:bg-indigo-100 transition-all text-xs uppercase tracking-widest">Protocol: Submax Test</button>
        </div>
      )}

      {entries.length > 1 && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-left">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-slate-900">Readiness Trends</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adaptation Context</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">28-Day View</span>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                />
                <Tooltip 
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700}}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle" 
                  wrapperStyle={{paddingBottom: '20px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'}} 
                />
                <Line 
                  name="Short Term (7d)" 
                  type="monotone" 
                  dataKey="avg7" 
                  stroke="#4f46e5" 
                  strokeWidth={4} 
                  dot={false}
                  animationDuration={1500}
                />
                <Line 
                  name="Baseline (28d)" 
                  type="monotone" 
                  dataKey="avg28" 
                  stroke="#cbd5e1" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={false}
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 font-medium leading-relaxed italic">
            *This graph represents your body's response to training load. Waves are a sign of healthy adaptation.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
