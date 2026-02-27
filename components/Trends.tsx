
import React, { useMemo, useState, useEffect } from 'react';
import { WellnessEntry, User } from '../types';
import { storageService } from '../services/storageService';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';

interface TrendsProps {
  entries: WellnessEntry[];
  user: User;
}

const Sparkline: React.FC<{ 
  label: string; 
  data: any[]; 
  metricKey: string; 
  stats: any;
  inflectionPoint?: { metric: string; date: string } | null;
}> = ({ label, data, metricKey, stats, inflectionPoint }) => {
  const currentVal = data[data.length - 1]?.[metricKey];
  const isHighlighted = inflectionPoint?.metric === metricKey;
  
  // Calculate inflection index
  const inflectionIndex = useMemo(() => {
    if (!isHighlighted || !inflectionPoint?.date) return -1;
    return data.findIndex(d => d.fullDate.startsWith(inflectionPoint.date));
  }, [data, isHighlighted, inflectionPoint]);

  const normalData = useMemo(() => {
    if (inflectionIndex === -1) return data;
    return data.slice(0, inflectionIndex + 1);
  }, [data, inflectionIndex]);

  const highlightedData = useMemo(() => {
    if (inflectionIndex === -1) return [];
    return data.slice(inflectionIndex);
  }, [data, inflectionIndex]);

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-40">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className={`text-sm font-black ${isHighlighted ? 'text-indigo-600' : 'text-slate-900'}`}>{currentVal}</span>
      </div>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {/* SD Band */}
            <Area 
              type="monotone" 
              dataKey={() => stats.mean + stats.stdDev} 
              stroke="none" 
              fill="#f1f5f9" 
              fillOpacity={0.5}
              baseLine={stats.mean - stats.stdDev}
              animationDuration={0}
            />
            {/* Normal Line */}
            <Line 
              type="monotone" 
              data={normalData}
              dataKey={metricKey} 
              stroke={isHighlighted ? "#cbd5e1" : "#4f46e5"} 
              strokeWidth={isHighlighted ? 1 : 2} 
              dot={false}
              animationDuration={1000}
            />
            {/* Highlighted Line */}
            {isHighlighted && (
              <Line 
                type="monotone" 
                data={highlightedData}
                dataKey={metricKey} 
                stroke="#4f46e5" 
                strokeWidth={3} 
                dot={false}
                animationDuration={1000}
              />
            )}
            {/* Anchor Dot */}
            <Line
              type="monotone"
              dataKey={metricKey}
              stroke="none"
              dot={(props: any) => {
                const { cx, cy, index } = props;
                if (index === data.length - 1) {
                  return <circle cx={cx} cy={cy} r={3} fill="#4f46e5" stroke="white" strokeWidth={2} />;
                }
                return null;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Trends: React.FC<TrendsProps> = ({ entries, user }) => {
  const [inflectionPoint, setInflectionPoint] = useState<{ metric: string; date: string } | null>(null);

  useEffect(() => {
    const loadInflection = () => {
      const stored = localStorage.getItem('ai_inflection_point');
      if (stored) {
        try {
          setInflectionPoint(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse inflection point");
        }
      }
    };

    loadInflection();
    window.addEventListener('ai_inflection_updated', loadInflection);
    return () => window.removeEventListener('ai_inflection_updated', loadInflection);
  }, []);

  const { wellnessData, srpeData, stats } = useMemo(() => {
    if (entries.length === 0) return { wellnessData: [], srpeData: [], stats: [] };
    
    const sortedEntries = [...entries].reverse();
    const last14 = sortedEntries.slice(-14);
    
    const wellness = last14.map(e => {
      const date = new Date(e.isoDate);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: e.isoDate,
        sleepQuality: e.sleepQuality,
        energy: e.energy,
        stress: e.stress,
        soreness: e.soreness,
        social: e.social,
        sleepHours: e.sleepHours
      };
    });

    const srpe = last14.map(e => {
      const date = new Date(e.isoDate);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        rpe: e.lastSessionRPE
      };
    });

    const metricStats = storageService.calculateMetricStats(entries, 28, user.personalityCalibration);
    
    return { wellnessData: wellness, srpeData: srpe, stats: metricStats };
  }, [entries, user.personalityCalibration]);

  const wellnessMetrics = [
    { key: 'sleepQuality', label: 'Sleep Quality' },
    { key: 'energy', label: 'Energy' },
    { key: 'stress', label: 'Stress' },
    { key: 'soreness', label: 'Soreness' },
    { key: 'social', label: 'Mood' },
    { key: 'sleepHours', label: 'Sleep Hours' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="text-left">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Vital Signs</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">14-Day System Trajectory</p>
      </div>

      {/* sRPE Bar Chart - The Load Foundation */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Load (sRPE)</h3>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Load Foundation</span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={srpeData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 10]} hide />
              <Bar dataKey="rpe" radius={[4, 4, 0, 0]}>
                {srpeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rpe > 7 ? '#4f46e5' : '#e2e8f0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wellness Sparklines Grid */}
      <div className="grid grid-cols-2 gap-4">
        {wellnessMetrics.map(m => {
          const metricStat = stats.find(s => s.key === m.key);
          return (
            <Sparkline 
              key={m.key} 
              label={m.label} 
              data={wellnessData} 
              metricKey={m.key} 
              stats={metricStat}
              inflectionPoint={inflectionPoint}
            />
          );
        })}
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <div className="w-32 h-32 border-8 border-white rounded-full"></div>
        </div>
        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">System Intelligence</h4>
        <p className="text-sm font-medium leading-relaxed opacity-80">
          The shaded bands represent your personal 28-day stability range. When a line breaks out of this band, it indicates a biological outlier. The AI Assistant Coach highlights segments where system turbulence was first detected.
        </p>
      </div>
    </div>
  );
};

export default Trends;
