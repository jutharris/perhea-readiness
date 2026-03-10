import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, SubmaxTest, TrainingFocus, PersonalityCalibration, Message, WellnessEntry } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Activity, MessageSquare, LayoutGrid, 
  ArrowLeft, Filter, Zap,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import Insights from './Insights';
import SubmaxTestUpload from './SubmaxTestUpload';
import { storageService } from '../services/storageService';

const TrendIndicator = ({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) => {
  if (!previous) return <Minus className="w-3 h-3 text-slate-300" />;
  const diff = current - previous;
  const isGood = inverse ? diff < 0 : diff > 0;
  if (Math.abs(diff) < 0.1) return <Minus className="w-3 h-3 text-slate-300" />;
  return isGood ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />;
};

const SubjectiveHeatmap = ({ entries }: { entries: WellnessEntry[] }) => {
  const metrics = ['energy', 'soreness', 'sleepQuality', 'stress', 'social'];
  const days = 14;
  
  const last14Days = Array.from({ length: days }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const data = last14Days.map(date => {
    const entry = entries.find(e => e.isoDate.startsWith(date));
    return { date, entry };
  });

  const getColor = (val: number | undefined) => {
    if (val === undefined) return 'bg-slate-100';
    // All metrics are now Readiness Scores: High is Good (Green), Low is Bad (Red)
    if (val >= 6) return 'bg-emerald-500';
    if (val >= 4) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Subjective Heatmap</h3>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[100px_repeat(14,1fr)] gap-2">
            <div></div>
            {data.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">
                  {new Date(d.date).toLocaleDateString([], { weekday: 'short' })[0]}
                </p>
                <p className="text-[7px] font-bold text-slate-300">
                  {new Date(d.date).getDate()}
                </p>
              </div>
            ))}

            {metrics.map(metric => (
              <React.Fragment key={metric}>
                <div className="flex items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                    {metric.replace('Quality', '')}
                  </span>
                </div>
                {data.map((d, i) => {
                  const val = d.entry ? (d.entry as any)[metric] : undefined;
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square rounded-lg transition-all duration-500 ${getColor(val)} ${d.entry ? 'shadow-sm' : 'opacity-20'}`}
                      title={d.entry ? `${metric}: ${val}` : 'No data'}
                    ></div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Optimal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Critical</span>
        </div>
      </div>
    </div>
  );
};

const AthleteDetail: React.FC<any> = ({ athlete: initialAthlete, entries, coachId, onRefresh, onBack }) => {
  const [athlete, setAthlete] = useState<User>(initialAthlete);
  const [msg, setMsg] = useState('');
  const [tests, setTests] = useState<SubmaxTest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [, setLoading] = useState(true);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [activeLines, setActiveLines] = useState(['rpe', 'stress']);

  const trendData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    
    // Sort entries by date ascending
    const sortedEntries = [...entries].sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());

    sortedEntries.forEach(e => {
      const date = new Date(e.isoDate);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      if (!dataMap[dateStr]) {
        dataMap[dateStr] = { date: label, rawDate: dateStr };
      }
      
      // Current day metrics
      dataMap[dateStr].stress = e.stress;
      dataMap[dateStr].sleep = e.sleepQuality;
      dataMap[dateStr].energy = e.energy;
      dataMap[dateStr].soreness = e.soreness;
      dataMap[dateStr].social = e.social;

      // Offset RPE to previous day (since audit asks for "Yesterday's RPE")
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const prevLabel = prevDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

      if (!dataMap[prevDateStr]) {
        dataMap[prevDateStr] = { date: prevLabel, rawDate: prevDateStr };
      }
      dataMap[prevDateStr].rpe = e.lastSessionRPE;
    });

    // Filter to only show dates that have at least one metric
    return Object.values(dataMap)
      .filter(d => d.rpe !== undefined || d.stress !== undefined)
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [entries]);

  const averages = useMemo(() => {
    const getAvg = (days: number) => storageService.getAverages(entries, days);
    return {
      d7: getAvg(7),
      d14: getAvg(14),
      d28: getAvg(28)
    };
  }, [entries]);

  const toggleLine = (line: string) => {
    setActiveLines(prev => prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]);
  };

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storageService.getSubmaxTestsForUser(athlete.id);
      setTests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [athlete.id]);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await storageService.getMessages(athlete.id);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  }, [athlete.id]);

  const markAllRead = useCallback(async () => {
    try {
      await storageService.markAthleteAsRead(coachId, athlete.id);
      await fetchMessages();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, [coachId, athlete.id, fetchMessages, onRefresh]);

  const unreadCount = useMemo(() => {
    const unreadMsgs = messages.filter(m => m.receiverId === coachId && m.read !== true).length;
    const unreadNotes = entries.filter((e: any) => (e.comments && e.comments.trim().length > 0) && e.readByCoach !== true).length;
    return unreadMsgs + unreadNotes;
  }, [messages, entries, coachId]);

  useEffect(() => {
    fetchTests();
    fetchMessages();
    
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchTests, fetchMessages]);

  useEffect(() => {
    if (unreadCount > 0) {
      markAllRead();
    }
  }, [unreadCount, markAllRead]);

  useEffect(() => {
    if (showChat && unreadCount > 0) {
      markAllRead();
    }
  }, [showChat, unreadCount, markAllRead]);

  const updateFocus = async (focus: TrainingFocus) => {
    try {
      await storageService.updateTrainingFocus(athlete.id, focus);
      setAthlete({ ...athlete, trainingFocus: focus });
    } catch (err: any) {
      console.error("Focus Update Error:", err);
      alert("Failed to update focus: " + (err.message || "Unknown error"));
    }
  };

  const updateCalibration = async (calibration: PersonalityCalibration) => {
    try {
      await storageService.updatePersonalityCalibration(athlete.id, calibration);
      setAthlete({ ...athlete, personalityCalibration: calibration });
    } catch (err: any) {
      console.error("Calibration Update Error:", err);
      alert("Failed to update reporting style: " + (err.message || "Unknown error"));
    }
  };

  const athleteAge = useMemo(() => {
    if (!athlete.birthDate) return null;
    const birth = new Date(athlete.birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }, [athlete.birthDate]);

  const send = async () => { 
    if (!msg.trim()) return;
    await storageService.sendMessage(coachId, athlete.id, msg); 
    setMsg(''); 
    fetchMessages();
  };

  const getTestAnalysis = useCallback((test: SubmaxTest, index: number) => {
    const compliance = test.summary?.compliance || 'COMPLIANT';
    if (compliance === 'NON_COMPLIANT') {
      return { change: 0, label: 'INVALID TEST', color: 'text-rose-400' };
    }

    const prevTest = tests.slice(index + 1).find(t => (t.summary?.compliance || 'COMPLIANT') !== 'NON_COMPLIANT');
    if (!prevTest) return { change: 0, label: 'BASELINE', color: 'text-slate-400' };

    let change: number;
    if (test.sport === 'run') {
      const currentTotal = test.data.reduce((acc: number, m: any) => acc + m.split_time_sec, 0);
      const prevTotal = prevTest.data.reduce((acc: number, m: any) => acc + m.split_time_sec, 0);
      change = ((prevTotal - currentTotal) / prevTotal) * 100; // Positive is faster
    } else {
      const currentEff = test.summary?.power_avg;
      const prevEff = prevTest.summary?.power_avg;
      change = ((currentEff - prevEff) / prevEff) * 100; // Positive is more efficient (higher power at same HR)
    }

    const focus = athlete.trainingFocus;
    const isAging = athleteAge && athleteAge >= 45;
    const absChange = Math.abs(change);

    // 1. Specificity Logic: Speed/Power focus allows for slight efficiency trade-offs
    if (focus === 'SPEED' || focus === 'POWER' || focus === 'STRENGTH') {
      if (change < 0 && absChange <= 1.5) {
        return { change, label: 'EXPECTED SHIFT', color: 'text-amber-400' };
      }
    }

    // 2. Biological Resilience: Stability is a major win for aging athletes
    if (isAging && absChange <= 0.5) {
      return { change, label: 'RESILIENCE MAINTAINED', color: 'text-emerald-500 font-black' };
    }

    if (absChange <= 0.5) return { change, label: 'STABILIZING', color: 'text-indigo-500' };
    if (absChange <= 1.5) return { change, label: change > 0 ? 'SUBTLE IMPROVEMENT' : 'SUBTLE DECLINE', color: change > 0 ? 'text-emerald-500' : 'text-amber-500' };
    return { change, label: change > 0 ? 'SIGNIFICANT GAIN' : 'SIGNIFICANT FATIGUE', color: change > 0 ? 'text-emerald-600' : 'text-rose-600' };
  }, [tests, athlete.trainingFocus, athleteAge]);

  const stabilityIndex = useMemo(() => {
    if (!athleteAge || athleteAge < 45 || tests.length < 3) return null;
    const recentTests = tests.slice(0, 5);
    const changes = recentTests.map((t, i) => {
      if (i === recentTests.length - 1) return null;
      const analysis = getTestAnalysis(t, i);
      return Math.abs(analysis.change);
    }).filter(c => c !== null) as number[];
    
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return Math.max(0, Math.min(100, 100 - (avgChange * 10))); // Scale: 1% avg change = 90 index
  }, [athleteAge, tests, getTestAnalysis]);

  const comparisonData = useMemo(() => {
    if (!comparisonId) return null;
    const testA = tests[0];
    const testB = tests.find(t => t.id === comparisonId);
    if (!testA || !testB) return null;

    const getMetrics = (t: SubmaxTest) => {
      if (t.sport === 'run') {
        const totalSec = t.data.reduce((acc: number, m: any) => acc + m.split_time_sec, 0);
        return { total: totalSec, hr: t.summary?.hr_avg, gap: t.summary?.split_range_sec };
      }
      return { total: t.summary?.power_avg, hr: t.summary?.hr_avg, gap: t.summary?.eff_change_pct_seg3_vs_seg1 };
    };

    const mA = getMetrics(testA);
    const mB = getMetrics(testB);

    return { testA, testB, mA, mB };
  }, [comparisonId, tests]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-900 font-sans p-8 overflow-y-auto">
      {/* Top Header / Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{athlete.firstName} {athlete.lastName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                Focus: {athlete.trainingFocus?.replace('_', ' ') || 'NONE'}
              </span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
                Style: {athlete.personalityCalibration || 'BALANCED'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowConfig(true)}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Config
          </button>
          <button 
            onClick={() => setShowChat(true)}
            className="relative px-6 py-3 bg-white border border-slate-200 text-slate-700 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
            {unreadCount > 0 && (
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
            )}
          </button>
          <button 
            onClick={() => setShowUpload(true)}
            className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Upload Submax
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Top Section: AI Audit History & AI Assistant Coach */}
        <div className="bg-slate-900 rounded-[2.5rem] text-white shadow-2xl overflow-hidden">
          <div className="grid grid-cols-12">
            {/* AI Audit History - Horizontal Cards */}
            <div className="col-span-12 lg:col-span-7 p-8 border-b lg:border-b-0 lg:border-r border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black uppercase tracking-widest">AI Audit History</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {entries.slice(0, 10).map((entry, i) => (
                  <div key={i} className="flex-shrink-0 w-48 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/40 uppercase">
                        {i === 0 ? 'Today' : i === 1 ? 'Yesterday' : new Date(entry.isoDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">RPE {entry.lastSessionRPE}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/70 italic line-clamp-3">
                      {entry.comments || "No notes logged."}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Assistant Coach */}
            <div className="col-span-12 lg:col-span-5 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black uppercase tracking-widest">AI Assistant Coach</h3>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <Insights entries={entries} user={athlete} role="COACH" personalityCalibration={athlete.personalityCalibration} />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Current Status & Master Trend */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left: Current Status */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Current Status</h3>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100">
                    {entries[0]?.lastSessionRPE || 0}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Latest RPE</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{entries[0]?.sessionType || 'REST'}</p>
                  </div>
                  <div className="w-full pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged</span>
                    <span className="text-xs font-bold text-slate-900">{entries[0] ? new Date(entries[0].isoDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'Sleep', val: entries[0]?.sleepQuality, max: 7 },
                    { label: 'Energy', val: entries[0]?.energy, max: 7 },
                    { label: 'Stress Mgmt', val: entries[0]?.stress, max: 7 },
                    { label: 'Freshness', val: entries[0]?.soreness, max: 7 }
                  ].map(m => (
                    <div key={m.label} className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <span>{m.label}</span>
                        <span>{m.val || 0}/{m.max}</span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((m.val || 0) / m.max) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SubjectiveHeatmap entries={entries} />
          </div>

          {/* Right: Master Trend */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="max-w-md">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Master Trend Engine</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Longitudinal Covariance Analysis (RPE Offset Applied)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['rpe', 'stress', 'sleep', 'energy', 'soreness'].map(key => (
                    <button 
                      key={key}
                      onClick={() => toggleLine(key)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        activeLines.includes(key) 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-8 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}
                    />
                    {activeLines.includes('rpe') && <Line type="monotone" dataKey="rpe" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} name="RPE" />}
                    {activeLines.includes('stress') && <Line type="monotone" dataKey="stress" stroke="#F43F5E" strokeWidth={2} strokeDasharray="5 5" dot={false} name="STRESS" />}
                    {activeLines.includes('sleep') && <Line type="monotone" dataKey="sleep" stroke="#10B981" strokeWidth={2} dot={false} name="SLEEP" />}
                    {activeLines.includes('energy') && <Line type="monotone" dataKey="energy" stroke="#F59E0B" strokeWidth={2} dot={false} name="ENERGY" />}
                    {activeLines.includes('soreness') && <Line type="monotone" dataKey="soreness" stroke="#8B5CF6" strokeWidth={2} dot={false} name="SORENESS" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-8">
                {[
                  { label: '7-Day Trend', data: averages.d7, prev: averages.d14 },
                  { label: '14-Day Trend', data: averages.d14, prev: averages.d28 },
                  { label: '28-Day Trend', data: averages.d28, prev: null }
                ].map((t, i) => (
                  <div key={i} className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.label}</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">RPE</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-slate-900">{(t.data?.rpe || 0).toFixed(1)}</span>
                          {t.prev && t.data && <TrendIndicator current={t.data.rpe} previous={t.prev.rpe} inverse />}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Stress</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-slate-900">{(t.data?.stress || 0).toFixed(1)}</span>
                          {t.prev && t.data && <TrendIndicator current={t.data.stress} previous={t.prev.stress} inverse />}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Sleep</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-slate-900">{(t.data?.sleep || 0).toFixed(1)}</span>
                          {t.prev && t.data && <TrendIndicator current={t.data.sleep} previous={t.prev.sleep} />}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Energy</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-slate-900">{(t.data?.energy || 0).toFixed(1)}</span>
                          {t.prev && t.data && <TrendIndicator current={t.data.energy} previous={t.prev.energy} />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Submax Performance */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Submax Performance</h3>
            </div>
            {stabilityIndex !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Stability Index</span>
                <span className="text-sm font-black text-emerald-700">{(stabilityIndex || 0).toFixed(0)}%</span>
              </div>
            )}
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test, i) => {
                const analysis = getTestAnalysis(test, i);
                return (
                  <div key={test.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 hover:border-indigo-200 transition-all group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{test.sport}</p>
                        <p className="text-sm font-black text-slate-900">{new Date(test.testDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${test.summary?.compliance === 'NON_COMPLIANT' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {test.summary?.compliance || 'COMPLIANT'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Avg HR</p>
                        <p className="text-lg font-black text-slate-900">{test.summary?.hr_avg} <span className="text-[10px] text-slate-400">BPM</span></p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{test.sport === 'run' ? 'Avg Pace' : 'Avg Power'}</p>
                        <p className="text-lg font-black text-slate-900">
                          {test.sport === 'run' ? test.summary?.pace_avg : `${test.summary?.power_avg}W`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${analysis.color}`}>{analysis.label}</span>
                      <button 
                        onClick={() => setComparisonId(test.id)}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                      >
                        Compare
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showConfig && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfig(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Configuration</h3>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-50 rounded-full">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Reporting Style</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Calibrate AI & Volatility Sensitivity</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['STOIC', 'BALANCED', 'EXPRESSIVE'].map(c => (
                    <button
                      key={c}
                      onClick={() => updateCalibration(c as PersonalityCalibration)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${athlete.personalityCalibration === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Training Focus</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Define Primary Adaptation Goal</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['SPEED', 'POWER', 'STRENGTH', 'AEROBIC_EFFICIENCY', 'VOLUME_TOLERANCE'].map(f => (
                    <button
                      key={f}
                      onClick={() => updateFocus(f as TrainingFocus)}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${athlete.trainingFocus === f ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowConfig(false)}
                className="w-full py-4 bg-slate-900 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-slate-200"
              >
                Close Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      {showChat && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowChat(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Chat with {athlete.firstName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direct Line</p>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 italic font-medium">No messages yet.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderId === coachId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium shadow-sm ${
                      m.senderId === coachId 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {m.text}
                      <div className={`text-[8px] mt-2 flex items-center gap-1 opacity-60 ${m.senderId === coachId ? 'justify-end' : 'justify-start'}`}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.senderId === coachId && m.read && (
                          <span className="text-[8px] font-black uppercase tracking-tighter ml-1">Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="relative">
                <textarea 
                  value={msg} 
                  onChange={e => setMsg(e.target.value)} 
                  placeholder="Send guidance..." 
                  className="w-full h-32 p-4 bg-slate-50 rounded-2xl outline-none text-sm border border-slate-100 focus:border-indigo-300 transition-colors resize-none pr-12" 
                />
                <button 
                  onClick={send} 
                  disabled={!msg.trim()}
                  className="absolute bottom-4 right-4 p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <Zap className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {comparisonId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-widest">Longitudinal Comparison</h3>
              <button onClick={() => setComparisonId(null)} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest">Close</button>
            </div>
            
            {comparisonData && (
              <>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Build</p>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-xs font-bold">{new Date(comparisonData.testA.createdAt).toLocaleDateString()}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Aerobic Floor</span>
                          <span className="font-black">{comparisonData.mA.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Avg HR</span>
                          <span className="font-black">{Math.round(comparisonData.mA.hr || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Historical Reference</p>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-xs font-bold">{new Date(comparisonData.testB.createdAt).toLocaleDateString()}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Aerobic Floor</span>
                          <span className="font-black">{comparisonData.mB.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="opacity-60">Avg HR</span>
                          <span className="font-black">{Math.round(comparisonData.mB.hr || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-bold text-indigo-400">
                    Analysis: {comparisonData.mA.total > comparisonData.mB.total ? 'Aerobic floor has risen.' : 'Biological resilience maintained.'} 
                    The athlete is currently {Math.abs(((comparisonData.mA.total - comparisonData.mB.total) / comparisonData.mB.total) * 100).toFixed(1)}% {comparisonData.mA.total > comparisonData.mB.total ? 'more' : 'less'} efficient than the reference point.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl">
            <SubmaxTestUpload 
              user={athlete} 
              onComplete={() => {
                setShowUpload(false);
                fetchTests();
              }} 
              onCancel={() => setShowUpload(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteDetail;
