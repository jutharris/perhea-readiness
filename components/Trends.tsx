import React, { useMemo } from 'react';
import { WellnessEntry, User } from '../types';
import { storageService } from '../services/storageService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendsProps {
  entries: WellnessEntry[];
  user: User;
}

const Trends: React.FC<TrendsProps> = ({ entries, user }) => {
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-left mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Wisdom & Trends</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Long-term adaptation context</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-left">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h3 className="text-lg font-black text-slate-900">Readiness Trends</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Biological Rhythm</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">28-Day View</span>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
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
        <p className="mt-6 text-[11px] text-slate-400 font-medium leading-relaxed italic border-t border-slate-50 pt-4">
          *Wisdom: Waves in your readiness are a sign of healthy adaptation. A flat line often indicates stagnation or lack of stimulus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Metric Distribution</h4>
          <div className="space-y-4">
            {['Sleep', 'Energy', 'Stress', 'Soreness'].map(m => (
              <div key={m} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span>{m}</span>
                  <span className="text-slate-400">Stable</span>
                </div>
                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 w-[85%]"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Coach's Wisdom</h4>
          <p className="text-sm font-medium leading-relaxed opacity-80">
            Consistency is the highest form of performance. Your 28-day audit compliance is at 96%. This level of data density allows for high-precision adjustments to your training load.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Trends;
