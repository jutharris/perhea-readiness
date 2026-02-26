import React, { useState, useEffect, useMemo } from 'react';
import { User, WellnessEntry, SubmaxTest, TrainingFocus } from '../types';
import Dashboard from './Dashboard';
import Insights from './Insights';
import { storageService } from '../services/storageService';

const AthleteDetail: React.FC<any> = ({ athlete: initialAthlete, entries, coachId, onBack }) => {
  const [athlete, setAthlete] = useState<User>(initialAthlete);
  const [msg, setMsg] = useState('');
  const [tests, setTests] = useState<SubmaxTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonId, setComparisonId] = useState<string | null>(null);

  const athleteAge = useMemo(() => {
    if (!athlete.birthDate) return null;
    const birth = new Date(athlete.birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }, [athlete.birthDate]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = await storageService.getSubmaxTestsForUser(athlete.id);
        setTests(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [athlete.id]);

  const updateFocus = async (focus: TrainingFocus) => {
    try {
      await storageService.updateTrainingFocus(athlete.id, focus);
      setAthlete({ ...athlete, trainingFocus: focus });
    } catch (err) {
      alert("Failed to update focus");
    }
  };

  const send = async () => { 
    await storageService.saveAdjustment(athlete.id, coachId, msg); 
    setMsg(''); 
    alert('Sent'); 
  };

  const getTestAnalysis = (test: SubmaxTest, index: number) => {
    const prevTest = tests[index + 1];
    if (!prevTest) return { change: 0, label: 'BASELINE', color: 'text-slate-400' };

    let change = 0;
    if (test.sport === 'run') {
      const currentTotal = test.data.reduce((acc: number, m: any) => acc + m.split_time_sec, 0);
      const prevTotal = prevTest.data.reduce((acc: number, m: any) => acc + m.split_time_sec, 0);
      change = ((prevTotal - currentTotal) / prevTotal) * 100; // Positive is faster
    } else {
      const currentEff = test.summary?.power_avg / test.summary?.hr_avg;
      const prevEff = prevTest.summary?.power_avg / prevTest.summary?.hr_avg;
      change = ((currentEff - prevEff) / prevEff) * 100; // Positive is more efficient
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
      return { total: t.summary?.power_avg / t.summary?.hr_avg, hr: t.summary?.hr_avg, gap: t.summary?.eff_change_pct_seg3_vs_seg1 };
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
    <div className="space-y-8">
      <button onClick={onBack} className="text-xs font-black text-slate-400 uppercase tracking-widest">← Back</button>
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900">{athlete.firstName} {athlete.lastName}</h2>
          <div className="flex items-center gap-2">
            {athleteAge && athleteAge >= 45 && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
                <span className="text-xs font-black uppercase tracking-widest">Biological Resilience</span>
                {stabilityIndex !== null && (
                  <span className="text-[10px] font-bold opacity-60">Index: {stabilityIndex.toFixed(0)}</span>
                )}
              </div>
            )}
            {athlete.trainingFocus && (
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                Focus: {athlete.trainingFocus.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['SPEED', 'POWER', 'STRENGTH', 'AEROBIC_EFFICIENCY', 'VOLUME_TOLERANCE'] as TrainingFocus[]).map(f => (
            <button
              key={f}
              onClick={() => updateFocus(f)}
              className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${athlete.trainingFocus === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      
      <Dashboard entries={entries} user={athlete} onNewReport={() => {}} hideAction />

      {comparisonData && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black uppercase tracking-widest">Longitudinal Comparison</h3>
            <button onClick={() => setComparisonId(null)} className="text-white/40 hover:text-white">✕</button>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Build</p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs font-bold">{new Date(comparisonData.testA.createdAt).toLocaleDateString()}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Efficiency</span>
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
                    <span className="opacity-60">Efficiency</span>
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
        </div>
      )}

      {coachBrief && coachBrief.length > 0 && (
        <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <h3 className="text-lg font-black uppercase tracking-widest">Coach Brief: Covariance Detected</h3>
          </div>
          <p className="text-sm font-medium opacity-80 leading-relaxed">
            The system has detected a significant performance drop correlated with the following trends in the last 21 days:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coachBrief.map((c: any, i: number) => (
              <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{c.label}</p>
                <p className="text-sm font-bold">
                  {c.diff > 0 ? 'Increased' : 'Decreased'} by {Math.abs(c.diff).toFixed(1)} pts
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
            *This brief is generated by analyzing the covariance between submax results and daily wellness trends.
          </p>
        </div>
      )}
      
      {tests.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-slate-900">Submax Performance</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Objective Physiological Markers</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {tests.map((test, idx) => {
              const analysis = getTestAnalysis(test, idx);
              return (
                <div key={test.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded uppercase tracking-widest">{test.sport}</span>
                      <p className="text-xs font-bold text-slate-500">{new Date(test.createdAt).toLocaleDateString()}</p>
                      {idx > 0 && (
                        <button 
                          onClick={() => setComparisonId(test.id)}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          Compare to Latest
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{analysis.label}</p>
                      <p className={`text-lg font-black ${analysis.color}`}>
                        {analysis.change > 0 ? '+' : ''}{analysis.change.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg HR</p>
                      <p className="text-sm font-black text-slate-900">{Math.round(test.summary?.hr_avg || 0)} <span className="text-[10px] opacity-40">bpm</span></p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg {test.sport === 'bike' ? 'Power' : 'Pace'}</p>
                      <p className="text-sm font-black text-slate-900">
                        {test.sport === 'bike' ? Math.round(test.summary?.power_avg || 0) : test.summary?.split_range_mmss}
                        <span className="text-[10px] opacity-40"> {test.sport === 'bike' ? 'W' : ''}</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency Gap</p>
                      <p className="text-sm font-black text-slate-900">
                        {test.sport === 'bike' ? 
                          `${Math.abs(test.summary?.eff_change_pct_seg3_vs_seg1 || 0).toFixed(1)}%` : 
                          test.summary?.split_range_mmss}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Focus</p>
                      <p className="text-[10px] font-black text-slate-900 uppercase truncate">
                        {athlete.trainingFocus || 'NONE'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Insights entries={entries} role="COACH" />
      
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-4">
        <h3 className="font-bold">Protocol Update</h3>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Send guidance..." className="w-full h-32 p-4 bg-slate-50 rounded-2xl outline-none" />
        <button onClick={send} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl">Issue Protocol</button>
      </div>
    </div>
  );
};

export default AthleteDetail;
