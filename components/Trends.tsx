
import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { WellnessEntry, User, IntelligencePacket, SystemCalibration } from '../types';
import { storageService } from '../services/storageService';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell,
  ComposedChart, Line, ReferenceArea, Bar, Area
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
  
  const isCurrentlyDecoupled = useMemo(() => {
    if (currentVal === undefined || !stats || stats.mean === undefined || stats.stdDev === undefined) return false;
    const minNormal = stats.mean - stats.stdDev;
    const maxNormal = stats.mean + stats.stdDev;
    // We consider it decoupled if it's strictly outside the normal band
    return currentVal < minNormal || currentVal > maxNormal;
  }, [currentVal, stats]);

  const activeColor = isCurrentlyDecoupled ? "#f59e0b" : "#4f46e5"; // amber-500 vs indigo-600
  
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

  const yDomain = metricKey === 'sleepHours' ? [0, 12] : [0, 7] as [number, number];

  return (
    <div className={`bg-white p-4 rounded-2xl border ${isCurrentlyDecoupled ? 'border-amber-200 shadow-amber-500/10' : 'border-slate-100 shadow-sm'} flex flex-col h-40 transition-colors duration-500`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-black ${isCurrentlyDecoupled ? 'text-amber-500' : isHighlighted ? 'text-indigo-600' : 'text-slate-900'}`}>{currentVal}</span>
          {stats && stats.mean !== undefined && stats.stdDev !== undefined && (
            <span className="text-[9px] font-medium text-slate-500 mt-0.5">
              Avg: {stats.mean.toFixed(1)} | Normal: {Math.max(0, stats.mean - stats.stdDev).toFixed(1)} - {Math.min(yDomain[1], stats.mean + stats.stdDev).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeColor} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis domain={yDomain} hide />
            <XAxis dataKey="date" hide />
            
            {/* SD Band using ReferenceArea for stability */}
            {stats && stats.mean !== undefined && stats.stdDev !== undefined && (
              <ReferenceArea 
                y1={Math.max(0, stats.mean - stats.stdDev)} 
                y2={Math.min(yDomain[1], stats.mean + stats.stdDev)} 
                fill="#14b8a6" 
                fillOpacity={0.15} 
                stroke="none"
              />
            )}

            {/* Main Area - Fills the bottom */}
            <Area
              type="monotone"
              dataKey={metricKey}
              stroke="none"
              fill={`url(#gradient-${metricKey})`}
              animationDuration={1000}
            />

            {/* Normal Line (Before Inflection) */}
            <Line 
              type="monotone" 
              data={normalData}
              dataKey={metricKey} 
              stroke={!isCurrentlyDecoupled && isHighlighted ? "#e2e8f0" : activeColor} 
              strokeWidth={!isCurrentlyDecoupled && isHighlighted ? 1.5 : 2} 
              dot={false}
              animationDuration={1000}
            />
            
            {/* Highlighted Line (After Inflection) */}
            {isHighlighted && (
              <Line 
                type="monotone" 
                data={highlightedData}
                dataKey={metricKey} 
                stroke={activeColor} 
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
                  return <circle cx={cx} cy={cy} r={4} fill={activeColor} stroke="white" strokeWidth={2} />;
                }
                return null;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const BiologicalIdentity: React.FC<{ packet?: IntelligencePacket; daysLogged: number }> = ({ packet, daysLogged }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!packet || !packet.laws) return null;
  
  const sortedLaws = [...packet.laws].sort((a, b) => a.horizon - b.horizon);

  return (
    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse"></div>
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Biological Identity (50-Day Holy Grail)</h3>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      
      {isExpanded && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedLaws.map(law => {
              const isLocked = daysLogged < law.horizon;
              return (
                <div key={law.horizon} className={`p-4 rounded-2xl border space-y-2 ${isLocked ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{law.horizon}-Day {law.horizon === 50 ? 'Identity' : law.horizon === 28 ? 'Signature' : law.horizon === 14 ? 'Adaptation' : 'Vibe'}</span>
                    {!isLocked && (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                        law.status === 'STABLE' ? 'bg-emerald-500/10 text-emerald-400' : 
                        law.status === 'TURBULENT' ? 'bg-rose-500/10 text-rose-400' : 
                        'bg-indigo-500/10 text-indigo-400'
                      }`}>{law.status}</span>
                    )}
                    {isLocked && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-slate-800 text-slate-500">
                        <Lock size={10} className="inline mr-1" /> Locked
                      </span>
                    )}
                  </div>
                  {isLocked ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
                      <Lock size={24} className="text-slate-600" />
                      <p className="text-xs font-medium text-slate-400">
                        Gathering data... {law.horizon - daysLogged} days until unlock.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {law.laws.map((l, i) => (
                        <li key={i} className="text-xs font-medium text-slate-300 leading-relaxed">• {l}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          
          {packet.lastDeepAudit && (
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest text-center">
              Last Deep Audit: {new Date(packet.lastDeepAudit).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </div>
  );
};

const Trends: React.FC<TrendsProps> = ({ entries = [], user }) => {
  const [inflectionPoint, setInflectionPoint] = useState<{ metric: string; date: string } | null>(null);
  const [calibration, setCalibration] = useState<SystemCalibration | null>(null);
  const [overlayMetrics, setOverlayMetrics] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const systemCalibration = await storageService.getSystemCalibration();
      setCalibration(systemCalibration);
    };
    fetchData();

    const loadInflection = () => {
      const stored = localStorage.getItem('ai_inflection_point');
      if (stored) {
        try {
          setInflectionPoint(JSON.parse(stored));
        } catch {
          console.error("Failed to parse inflection point");
        }
      }
    };

    loadInflection();
    window.addEventListener('ai_inflection_updated', loadInflection);
    return () => window.removeEventListener('ai_inflection_updated', loadInflection);
  }, []);

  const { wellnessData, srpeData, stats } = useMemo(() => {
    if (!entries || entries.length === 0) return { wellnessData: [], srpeData: [], stats: [] };
    
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
        rpe: e.lastSessionRPE,
        sleepQuality: e.sleepQuality,
        energy: e.energy,
        stress: e.stress,
        soreness: e.soreness,
        social: e.social
      };
    });

    const metricStats = storageService.calculateMetricStats(entries, 28, user.personalityCalibration, calibration || undefined);
    
    return { wellnessData: wellness, srpeData: srpe, stats: metricStats };
  }, [entries, user.personalityCalibration, calibration]);

  if (!entries || entries.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center px-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">System Calibrating</h2>
          <p className="text-sm font-medium text-slate-500 max-w-xs">We need at least one audit entry to generate your 14-day system trajectory.</p>
        </div>
      </div>
    );
  }

  const wellnessMetrics = [
    { key: 'sleepQuality', label: 'Sleep Quality' },
    { key: 'energy', label: 'Energy' },
    { key: 'stress', label: 'Stress Mgmt' },
    { key: 'soreness', label: 'Freshness' },
    { key: 'social', label: 'Mood' },
    { key: 'sleepHours', label: 'Sleep Hours' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="text-left">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Vital Signs</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">14-Day System Trajectory</p>
      </div>

      <BiologicalIdentity packet={user.intelligencePacket} daysLogged={new Set(entries.map(e => e.isoDate)).size} />

      {/* sRPE Bar Chart - The Load Foundation */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Load (sRPE)</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">System Load vs Readiness Overlay</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {wellnessMetrics.filter(m => m.key !== 'sleepHours').map(m => (
              <button
                key={m.key}
                onClick={() => setOverlayMetrics(prev => 
                  prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
                )}
                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                  overlayMetrics.includes(m.key)
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {m.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={srpeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" hide />
              <YAxis yAxisId="left" domain={[0, 10]} hide />
              <YAxis yAxisId="right" domain={[0, 7]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
              />
              <Bar yAxisId="left" dataKey="rpe" name="sRPE" radius={[4, 4, 0, 0]}>
                {srpeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rpe > 7 ? '#4f46e5' : '#e2e8f0'} />
                ))}
              </Bar>
              {overlayMetrics.includes('energy') && (
                <Line yAxisId="right" type="monotone" dataKey="energy" name="Energy" stroke="#10b981" strokeWidth={3} dot={false} />
              )}
              {overlayMetrics.includes('sleepQuality') && (
                <Line yAxisId="right" type="monotone" dataKey="sleepQuality" name="Sleep" stroke="#3b82f6" strokeWidth={3} dot={false} />
              )}
              {overlayMetrics.includes('stress') && (
                <Line yAxisId="right" type="monotone" dataKey="stress" name="Stress" stroke="#f59e0b" strokeWidth={3} dot={false} />
              )}
              {overlayMetrics.includes('soreness') && (
                <Line yAxisId="right" type="monotone" dataKey="soreness" name="Freshness" stroke="#ec4899" strokeWidth={3} dot={false} />
              )}
              {overlayMetrics.includes('social') && (
                <Line yAxisId="right" type="monotone" dataKey="social" name="Mood" stroke="#8b5cf6" strokeWidth={3} dot={false} />
              )}
            </ComposedChart>
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
