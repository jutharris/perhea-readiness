import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { 
  Activity, MessageSquare, Calendar, LayoutGrid, 
  ChevronRight, ArrowLeft, Filter, Zap, Info,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

// --- Mock Data ---
const trendData = [
  { date: 'Feb 24', rpe: 4, stress: 3, sleep: 8, energy: 7, soreness: 2 },
  { date: 'Feb 25', rpe: 5, stress: 4, sleep: 7, energy: 6, soreness: 3 },
  { date: 'Feb 26', rpe: 8, stress: 7, sleep: 5, energy: 4, soreness: 6 },
  { date: 'Feb 27', rpe: 6, stress: 5, sleep: 6, energy: 5, soreness: 4 },
  { date: 'Feb 28', rpe: 7, stress: 4, sleep: 7, energy: 6, soreness: 3 },
  { date: 'Mar 01', rpe: 9, stress: 8, sleep: 4, energy: 3, soreness: 7 },
  { date: 'Mar 02', rpe: 5, stress: 3, sleep: 8, energy: 8, soreness: 2 },
];

const aiHistory = [
  { date: 'Mar 02', status: 'Optimal', text: "Recovery confirmed. Metrics have stabilized after yesterday's spike. Proceed with planned intensity." },
  { date: 'Mar 01', status: 'Warning', text: "Significant RPE/Stress divergence. Athlete reported high fatigue. Recommended 20% volume reduction." },
  { date: 'Feb 28', status: 'Stable', text: "Maintaining stable protocol. Slight climb in soreness noted but within expected range." },
  { date: 'Feb 27', status: 'Caution', text: "Sleep quality trending down. Monitor energy levels for tomorrow's submax session." },
];

// --- Option 1: Command Center ---
const CommandCenter = () => {
  const [activeLines, setActiveLines] = useState(['rpe', 'stress']);

  const toggleLine = (line: string) => {
    setActiveLines(prev => prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]);
  };

  return (
    <div className="flex h-full bg-[#0F1115] text-slate-300 font-sans overflow-hidden">
      {/* Left Sidebar: Mirror View */}
      <div className="w-80 border-r border-slate-800 p-6 flex flex-col gap-6 bg-[#15181E]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Activity className="text-indigo-400 w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Justin Harris</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Athlete Mirror</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase mb-2">Today's RPE</p>
            <div className="text-3xl font-black text-white">5 <span className="text-xs font-normal text-slate-500">/ 10</span></div>
          </div>
          
          <div className="space-y-3">
            {['Sleep', 'Stress', 'Energy'].map(metric => (
              <div key={metric} className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{metric}</span>
                <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Coach Note</p>
          <p className="text-[11px] leading-relaxed italic text-slate-400">
            "Justin is trending well after the deload. Keep an eye on his 'Stoic' reporting style."
          </p>
        </div>
      </div>

      {/* Main Stage: Trend Engine */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Master Trend Engine</h2>
          <div className="flex gap-2">
            {['rpe', 'stress', 'sleep', 'energy'].map(key => (
              <button 
                key={key}
                onClick={() => toggleLine(key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeLines.includes(key) 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-8">
          <div className="h-80 w-full bg-[#15181E] rounded-[2rem] p-6 border border-slate-800 shadow-2xl">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F1115', border: '1px solid #1E293B', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                {activeLines.includes('rpe') && <Line type="monotone" dataKey="rpe" stroke="#818CF8" strokeWidth={3} dot={{ r: 4, fill: '#818CF8' }} />}
                {activeLines.includes('stress') && <Line type="monotone" dataKey="stress" stroke="#F43F5E" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
                {activeLines.includes('sleep') && <Line type="monotone" dataKey="sleep" stroke="#10B981" strokeWidth={2} dot={false} />}
                {activeLines.includes('energy') && <Line type="monotone" dataKey="energy" stroke="#F59E0B" strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">AI Audit History</h3>
              <div className="space-y-3">
                {aiHistory.map((audit, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#15181E] border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-slate-500">{audit.date}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                        audit.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-400' :
                        audit.status === 'Warning' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {audit.status}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">{audit.text}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Correlation Insights</h3>
              <div className="p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/20 h-full">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Zap className="text-indigo-400 w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold mb-1">RPE/Stress Divergence</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      In the last 7 days, Justin's RPE has climbed 40% while reported Stress remained flat. This suggests physical fatigue is outpacing his lifestyle recovery.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Option 2: Timeline Narrative ---
const TimelineNarrative = () => {
  return (
    <div className="h-full bg-[#F8FAFC] text-slate-900 font-sans overflow-y-auto p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Justin Harris</h1>
            <p className="text-slate-500 font-medium">Weekly Narrative Context</p>
          </div>
          <div className="h-16 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <Area type="monotone" dataKey="rpe" stroke="#6366F1" fill="#6366F1" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-0 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
          {aiHistory.map((day, i) => (
            <div key={i} className="relative pl-16 pb-12 group">
              <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors">
                <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600">
                  {day.date.split(' ')[1]}
                </span>
              </div>
              
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-2 border-r border-slate-100 pr-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">RPE</div>
                    <div className="text-4xl font-black text-slate-900">{trendData[i].rpe}</div>
                    <div className="mt-4 space-y-2">
                      {['Sleep', 'Stress'].map(m => (
                        <div key={m} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-7">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">AI Audit Logic</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 font-medium italic">
                      "{day.text}"
                    </p>
                  </div>

                  <div className="col-span-3 flex flex-col justify-center gap-4">
                    <div className="h-8 w-full bg-slate-50 rounded-lg overflow-hidden">
                      {/* Sparkline Placeholder */}
                      <div className="h-full bg-indigo-500/10 flex items-end">
                        {[4,7,2,8,5,9,3].map((v, idx) => (
                          <div key={idx} className="flex-1 bg-indigo-500/40" style={{ height: `${v*10}%` }}></div>
                        ))}
                      </div>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 flex items-center gap-1">
                      View Full Entry <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Option 3: Grid Matrix ---
const GridMatrix = () => {
  const metrics = ['Energy', 'Stress', 'Sleep', 'Soreness', 'Social', 'Sick', 'Injured'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getColor = (val: number, metric: string) => {
    if (metric === 'Stress' || metric === 'Soreness') {
      if (val > 7) return 'bg-rose-500';
      if (val > 4) return 'bg-amber-500';
      return 'bg-emerald-500';
    }
    if (val > 7) return 'bg-emerald-500';
    if (val > 4) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="h-full bg-[#0F172A] text-slate-300 font-mono p-8 flex flex-col gap-8">
      {/* Top AI Status Bar */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {aiHistory.map((day, i) => (
          <div key={i} className="shrink-0 w-64 p-4 rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500">{day.date}</span>
              <div className={`w-2 h-2 rounded-full ${day.status === 'Optimal' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            </div>
            <p className="text-[10px] leading-tight text-slate-400 truncate">{day.text}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-white tracking-tighter">MISSION_CONTROL_MATRIX</h2>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-sm"></div> OPTIMAL</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-sm"></div> CAUTION</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded-sm"></div> ALERT</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left text-[10px] font-black text-slate-600 uppercase tracking-widest sticky left-0 bg-slate-900 z-20">Metric</th>
                {days.map(d => (
                  <th key={d} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800">
                <td className="p-4 text-[11px] font-black text-indigo-400 uppercase sticky left-0 bg-slate-900 z-20">Daily RPE</td>
                {trendData.map((d, i) => (
                  <td key={i} className="p-4 text-center">
                    <span className="text-lg font-black text-white">{d.rpe}</span>
                  </td>
                ))}
              </tr>
              {metrics.map(m => (
                <tr key={m} className="border-b border-slate-800/50 group">
                  <td className="p-4 text-[11px] font-bold text-slate-500 uppercase sticky left-0 bg-slate-900 z-20 group-hover:text-white transition-colors">{m}</td>
                  {trendData.map((d, i) => {
                    const val = (d as any)[m.toLowerCase()] || Math.floor(Math.random() * 10);
                    return (
                      <td key={i} className="p-2">
                        <div className={`h-12 rounded-xl ${getColor(val, m)} opacity-20 hover:opacity-100 transition-all cursor-crosshair flex items-center justify-center text-white font-black text-xs`}>
                          {val}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main Gallery Wrapper ---
export const CoachMockups = ({ onExit }: { onExit: () => void }) => {
  const [activeTab, setActiveTab] = useState<'option1' | 'option2' | 'option3'>('option1');

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Mockups
          </button>
          <div className="h-4 w-px bg-slate-800"></div>
          <h1 className="text-white font-black text-sm uppercase tracking-tighter">Coach Mission Control Concepts</h1>
        </div>
        
        <div className="flex bg-black rounded-xl p-1 border border-slate-800">
          <button 
            onClick={() => setActiveTab('option1')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'option1' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            1. Command Center
          </button>
          <button 
            onClick={() => setActiveTab('option2')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'option2' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            2. Timeline
          </button>
          <button 
            onClick={() => setActiveTab('option3')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'option3' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            3. Grid Matrix
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'option1' && <CommandCenter />}
        {activeTab === 'option2' && <TimelineNarrative />}
        {activeTab === 'option3' && <GridMatrix />}
      </div>
    </div>
  );
};

export default CoachMockups;
