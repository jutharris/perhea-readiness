import React, { useState, useEffect, useMemo } from 'react';
import { User, WellnessEntry, SubmaxTest, TrainingFocus, PersonalityCalibration, Message } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { 
  Activity, MessageSquare, Calendar, LayoutGrid, 
  ChevronRight, ArrowLeft, Filter, Zap, Info,
  CheckCircle2, AlertCircle, Clock, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import Dashboard from './Dashboard';
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

const AthleteDetail: React.FC<any> = ({ athlete: initialAthlete, entries, coachId, onRefresh, onBack }) => {
  const [athlete, setAthlete] = useState<User>(initialAthlete);
  const [msg, setMsg] = useState('');
  const [tests, setTests] = useState<SubmaxTest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeLines, setActiveLines] = useState(['rpe', 'stress']);
  const [trendWindow, setTrendWindow] = useState<7 | 14 | 28>(7);

  const trendData = useMemo(() => {
    return [...entries].reverse().map(e => ({
      date: new Date(e.isoDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      rpe: e.lastSessionRPE,
      stress: e.stress,
      sleep: e.sleepQuality,
      energy: e.energy,
      soreness: e.soreness,
      social: e.social,
      rawDate: e.isoDate
    }));
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

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await storageService.getSubmaxTestsForUser(athlete.id);
      setTests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await storageService.getMessages(athlete.id);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await storageService.markAthleteAsRead(coachId, athlete.id);
      await fetchMessages();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

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
  }, [athlete.id]);

  useEffect(() => {
    if (unreadCount > 0) {
      markAllRead();
    }
  }, [unreadCount, athlete.id]);

  useEffect(() => {
    if (showChat && unreadCount > 0) {
      markAllRead();
    }
  }, [showChat]);

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

  const getTestAnalysis = (test: SubmaxTest, index: number) => {
    const compliance = test.summary?.compliance || 'COMPLIANT';
    if (compliance === 'NON_COMPLIANT') {
      return { change: 0, label: 'INVALID TEST', color: 'text-rose-400' };
    }

    const prevTest = tests.slice(index + 1).find(t => (t.summary?.compliance || 'COMPLIANT') !== 'NON_COMPLIANT');
    if (!prevTest) return { change: 0, label: 'BASELINE', color: 'text-slate-400' };

    let change = 0;
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
  };

  const coachBrief = useMemo(() => {
    if (tests.length < 2) return null;
    const analysis = getTestAnalysis(tests[0], 0);
    if (analysis.change > -1.5) return null;

    const correlations = storageService.calculateCorrelations(entries, 21);
    return correlations;
  }, [tests, entries]);

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
  }, [athleteAge, tests]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Top Header / Navigation */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{athlete.firstName} {athlete.lastName}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                Focus: {athlete.trainingFocus?.replace('_', ' ') || 'NONE'}
              </span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
                Style: {athlete.personalityCalibration || 'BALANCED'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowChat(true)}
            className="relative px-6 py-3 bg-white border border-slate-200 text-slate-700 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            Open Chat
            {unreadCount > 0 && (
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
            )}
          </button>
          <button 
            onClick={() => setShowUpload(true)}
            className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
          >
            Upload Submax
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Command Center Stage */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Main Trend Engine */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Master Trend Engine</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitudinal Covariance Analysis</p>
              </div>
              <div className="flex gap-2">
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
                        <span className="text-xs font-black text-slate-900">{t.data?.rpe.toFixed(1)}</span>
                        {t.prev && <TrendIndicator current={t.data!.rpe} previous={t.prev.rpe} inverse />}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Stress</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-900">{t.data?.stress.toFixed(1)}</span>
                        {t.prev && <TrendIndicator current={t.data!.stress} previous={t.prev.stress} inverse />}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Sleep</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-900">{t.data?.sleep.toFixed(1)}</span>
                        {t.prev && <TrendIndicator current={t.data!.sleep} previous={t.prev.sleep} />}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Energy</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-900">{t.data?.energy.toFixed(1)}</span>
                        {t.prev && <TrendIndicator current={t.data!.energy} previous={t.prev.energy} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submax Performance Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Submax Performance</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Objective Physiological Markers</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.slice(0, 4).map((test, idx) => {
                const analysis = getTestAnalysis(test, idx);
                return (
                  <div key={test.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer" onClick={() => idx > 0 && setComparisonId(test.id)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded uppercase tracking-widest">{test.sport}</span>
                        <p className="text-[10px] font-bold text-slate-500">{new Date(test.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${analysis.color}`}>
                          {analysis.change > 0 ? '+' : ''}{analysis.change.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg HR</p>
                        <p className="text-xs font-black text-slate-900">{Math.round(test.summary?.hr_avg || 0)} bpm</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aerobic Floor</p>
                        <p className="text-xs font-black text-slate-900">
                          {test.sport === 'bike' ? `${Math.round(test.summary?.power_avg || 0)}W` : test.summary?.split_range_mmss}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Insights & Mirror */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* AI Audit History */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black uppercase tracking-widest">AI Audit History</h3>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
              {entries.slice(0, 7).map((entry, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/40 uppercase">{new Date(entry.isoDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">RPE {entry.lastSessionRPE}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/70 italic">
                    {entry.comments || "No notes logged for this entry."}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <Insights entries={entries} user={athlete} role="COACH" personalityCalibration={athlete.personalityCalibration} />
            </div>
          </div>

          {/* Athlete Mirror (Simplified Dashboard) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Athlete Mirror</h3>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Status</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black">
                    {entries[0]?.lastSessionRPE || 0}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Latest RPE</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{entries[0]?.sessionType || 'REST'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Sleep Quality', val: entries[0]?.sleepQuality, max: 7 },
                  { label: 'Energy Level', val: entries[0]?.energy, max: 7 },
                  { label: 'Stress Level', val: entries[0]?.stress, max: 7 },
                  { label: 'Soreness', val: entries[0]?.soreness, max: 7 }
                ].map(m => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span>{m.label}</span>
                      <span>{m.val || 0}/{m.max}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((m.val || 0) / m.max) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Configuration</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Reporting Style</p>
                <div className="grid grid-cols-3 gap-1">
                  {['STOIC', 'BALANCED', 'EXPRESSIVE'].map(c => (
                    <button
                      key={c}
                      onClick={() => updateCalibration(c as PersonalityCalibration)}
                      className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${athlete.personalityCalibration === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Focus</p>
                <div className="grid grid-cols-2 gap-1">
                  {['SPEED', 'POWER', 'STRENGTH', 'AEROBIC_EFFICIENCY', 'VOLUME_TOLERANCE'].map(f => (
                    <button
                      key={f}
                      onClick={() => updateFocus(f as TrainingFocus)}
                      className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${athlete.trainingFocus === f ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
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
