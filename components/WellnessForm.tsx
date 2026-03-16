
import React, { useState, useEffect } from 'react';
import SliderQuestion from './SliderQuestion';
import { storageService } from '../services/storageService';
import { getDeepAudit } from '../services/geminiService';
import { SessionType, PlannedMissionType, WellnessEntry, User } from '../types';
import { PRE_CHECK_IN_PRIMES, POST_SUBMIT_SEQUENCE, REGIME_PHILOSOPHIES } from '../constants/education';

const MISSION_BENCHMARKS: Record<PlannedMissionType, number> = {
  RECOVERY: 1.5,
  AEROBIC_BASE: 3.5,
  THRESHOLD_TEMPO: 6,
  INTERVALS_VO2MAX: 9,
  STRENGTH_POWER: 5.5,
  LONG_ENDURANCE: 5
};

const WellnessForm: React.FC<{ user: User; entries: WellnessEntry[]; onComplete: () => void }> = ({ user, entries, onComplete }) => {
  const [showPrime, setShowPrime] = useState(entries.length < 7);
  const [data, setData] = useState({ 
    sessionType: 'TRAINING' as SessionType, 
    plannedMissionType: 'AEROBIC_BASE' as PlannedMissionType,
    wearableScore: 5 as number | null,
    lastSessionRPE: 0, 
    energy: 4, 
    soreness: 4, 
    sleepQuality: 4, 
    sleepHours: '',
    stress: 4, 
    social: 4, 
    feelingSick: false, 
    injured: false, 
    menstrualCycle: false,
    comments: '' 
  });
  const [loading, setLoading] = useState(false);
  const [postSubmitState, setPostSubmitState] = useState<'idle' | 'rapid' | 'philosophy'>('idle');
  const [postSubmitStep, setPostSubmitStep] = useState(0);
  const [philosophySnippet, setPhilosophySnippet] = useState<EducationSnippet | null>(null);
  const [philosophyQuote, setPhilosophyQuote] = useState('');
  const [educationSnippets, setEducationSnippets] = useState<EducationSnippet[]>([]);

  useEffect(() => {
    storageService.getEducationSnippets().then(snippets => {
      setEducationSnippets(snippets.filter(s => s.approved));
    });
  }, []);

  const PRIMES = [
    {
      title: "The Sensor vs. The Soul",
      message: "Welcome to the Arena. Most apps treat you like a machine to be tracked. We treat you like a human to be audited. Your watch knows your pulse; only you know your soul. Today, don't just type numbers. Listen to the system."
    },
    {
      title: "The Analog Advantage",
      message: "Why are we asking how you feel? Because 'Perceived Effort' is the most accurate predictor of performance ever discovered. Your brain integrates millions of signals your watch can't see. Today, trust your gut over your gadgets."
    },
    {
      title: "The Hooper-Mackinnon Protocol",
      message: "We use the Hooper-Mackinnon model—the gold standard for elite readiness. By tracking Energy, Stress, Sleep, and Soreness, we map your internal 'Turbulence.' You're halfway to your first Bio Law. Stay the course."
    },
    {
      title: "The Divergence Signal",
      message: "Ever feel 'crushed' but your watch says 90% recovery? That's a Divergence. It’s the most dangerous moment for an athlete. We are looking for these gaps to protect you from the 'hidden' injury. Keep providing the truth."
    },
    {
      title: "The Bio-Law Architecture",
      message: "An AI is only as smart as its context. Every entry you provide is building your 'Intelligence Packet.' We aren't just logging data; we are writing the laws of your unique biology. 2 days until the first reveal."
    },
    {
      title: "The Regime Shift",
      message: "Data is noise without action. Soon, your audits won't just be records—they will be 'Regime' commands: Adapt, Build, or Restoration. You are training the system to know when to push and when to pivot. One day left."
    },
    {
      title: "The Reveal",
      message: "Final baseline entry. Today, the 'Analog' meets the 'AI.' After this audit, the system will synthesize your first 7 days into your first Bio Law. This is where the diary ends and the coaching begins. Finish strong."
    }
  ];

  const currentPrime = PRIMES[entries.length];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.sleepHours || isNaN(Number(data.sleepHours))) {
      alert("Please enter a valid number for Sleep Hours.");
      return;
    }
    setLoading(true);
    try {
      let divergenceIntensity = 0;
      if (data.sessionType === 'TRAINING' || data.sessionType === 'COMPETITION') {
        const benchmark = MISSION_BENCHMARKS[data.plannedMissionType];
        divergenceIntensity = data.lastSessionRPE - benchmark;
      }

      const entry = await storageService.saveEntry({ 
        ...data, 
        userId: user.id, 
        sleepHours: Number(data.sleepHours),
        divergenceIntensity
      });

      // 2. Check if Deep Audit is needed (Every 7 days or if missing)
      const lastAudit = user.intelligencePacket?.lastDeepAudit;
      const shouldAudit = !lastAudit || (new Date().getTime() - new Date(lastAudit).getTime()) > 7 * 24 * 60 * 60 * 1000;
      
      if (shouldAudit && entries.length >= 6) { // >= 6 because we just saved the 7th
        // Trigger background audit (don't await to keep UI snappy)
        getDeepAudit([entry, ...entries]).then(packet => {
          storageService.updateUserStatus(user.id, { intelligencePacket: packet });
        });
      }

      // Determine post-submit sequence
      const newEntryCount = entries.length + 1;
      const isPhilosophyDay = newEntryCount > 0 && newEntryCount % 3 === 0;
      
      if (isPhilosophyDay) {
        const regime = user.intelligencePacket?.regime || 'CALIBRATING';
        
        // Try to get a custom snippet first
        const customSnippets = educationSnippets.filter(s => s.type === 'PHILOSOPHY' && s.regime === regime);
        let randomQuote = '';
        
        if (customSnippets.length > 0) {
          const snippet = customSnippets[Math.floor(Math.random() * customSnippets.length)];
          setPhilosophySnippet(snippet);
          randomQuote = snippet.content;
        } else {
          // Fallback to hardcoded
          const quotes = REGIME_PHILOSOPHIES[regime] || REGIME_PHILOSOPHIES['CALIBRATING'];
          randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        }
        
        setPhilosophyQuote(randomQuote);
        setPostSubmitState('philosophy');
        
        setTimeout(() => {
          onComplete();
        }, 6000); // Increased time slightly to allow for interaction
      } else {
        setPostSubmitState('rapid');
        let step = 0;
        const interval = setInterval(() => {
          step++;
          if (step >= POST_SUBMIT_SEQUENCE.length) {
            clearInterval(interval);
            onComplete();
          } else {
            setPostSubmitStep(step);
          }
        }, 800);
      }

    } catch {
      alert("Error saving report.");
      setLoading(false);
    }
  };

  const ToggleSwitch = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
      <span className="font-bold text-slate-900 text-sm uppercase tracking-tight">{label}</span>
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button 
          type="button" 
          onClick={() => onChange(false)}
          className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${!value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
        >
          NO
        </button>
        <button 
          type="button" 
          onClick={() => onChange(true)}
          className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
        >
          YES
        </button>
      </div>
    </div>
  );

  if (postSubmitState === 'rapid') {
    return (
      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col items-center justify-center px-6 py-12 animate-in fade-in duration-500">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
        <div className="h-8 relative w-full flex justify-center">
          {POST_SUBMIT_SEQUENCE.map((text, i) => (
            <p 
              key={i}
              className={`absolute text-sm font-black uppercase tracking-widest text-slate-600 transition-all duration-300 ${
                postSubmitStep === i ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
              }`}
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (postSubmitState === 'philosophy') {
    return (
      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col items-center justify-center px-8 py-12 animate-in fade-in duration-1000 relative group">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
        </div>
        <p className="text-2xl font-medium text-slate-900 text-center leading-relaxed italic">
          "{philosophyQuote}"
        </p>
        {philosophySnippet && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100 z-50">
            <button
              type="button"
              onClick={() => handleSnippetInteraction(philosophySnippet.id, 'like')}
              className={`p-2 rounded-full transition-colors ${philosophySnippet.likedBy?.includes(user.id) ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
            >
              <svg className="w-5 h-5" fill={philosophySnippet.likedBy?.includes(user.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              type="button"
              onClick={() => handleSnippetInteraction(philosophySnippet.id, 'pass')}
              className={`p-2 rounded-full transition-colors ${philosophySnippet.passedBy?.includes(user.id) ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showPrime && currentPrime) {
    return (
      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col items-center justify-center space-y-12 px-6 py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-indigo-200">
          {entries.length + 1}
        </div>
        
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Baseline Protocol: Day {entries.length + 1}/7</p>
            <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tight leading-none">{currentPrime.title}</h2>
          </div>
          
          <p className="text-lg font-medium text-slate-600 leading-relaxed">
            {currentPrime.message}
          </p>
        </div>

        <button 
          onClick={() => setShowPrime(false)}
          className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
        >
          Continue to Audit
        </button>
      </div>
    );
  }

  const showPreCheckInMessage = entries.length >= 7 && entries.length % 2 === 0;
  
  // Try to get a custom snippet first
  const customPreCheckInSnippets = educationSnippets.filter(s => s.type === 'PRE_CHECK_IN');
  let preCheckInSnippet: EducationSnippet | null = null;
  let preCheckInQuote = '';
  
  if (customPreCheckInSnippets.length > 0) {
    preCheckInSnippet = customPreCheckInSnippets[entries.length % customPreCheckInSnippets.length];
    preCheckInQuote = preCheckInSnippet.content;
  } else {
    // Fallback to hardcoded
    preCheckInQuote = PRE_CHECK_IN_PRIMES[entries.length % PRE_CHECK_IN_PRIMES.length];
  }

  const handleSnippetInteraction = async (snippetId: string, action: 'like' | 'pass') => {
    try {
      await storageService.interactWithSnippet(snippetId, user.id, action);
      // Optimistically update local state
      setEducationSnippets(prev => prev.map(s => {
        if (s.id === snippetId) {
          const isLike = action === 'like';
          const hasLiked = s.likedBy?.includes(user.id);
          const hasPassed = s.passedBy?.includes(user.id);
          
          let newLikes = s.likes || 0;
          let newPasses = s.passes || 0;
          let newLikedBy = [...(s.likedBy || [])];
          let newPassedBy = [...(s.passedBy || [])];

          if (isLike && !hasLiked) {
            newLikes++;
            newLikedBy.push(user.id);
            if (hasPassed) {
              newPasses--;
              newPassedBy = newPassedBy.filter(id => id !== user.id);
            }
          } else if (!isLike && !hasPassed) {
            newPasses++;
            newPassedBy.push(user.id);
            if (hasLiked) {
              newLikes--;
              newLikedBy = newLikedBy.filter(id => id !== user.id);
            }
          }

          return { ...s, likes: newLikes, passes: newPasses, likedBy: newLikedBy, passedBy: newPassedBy };
        }
        return s;
      }));
    } catch (err) {
      console.error("Failed to interact with snippet", err);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto space-y-6 pb-20">
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-3xl font-black text-slate-900 italic uppercase">Daily Wellness Audit</h2>
        <p className="text-sm font-bold text-slate-400">Biological Readiness Protocol</p>
      </div>

      {showPreCheckInMessage && (
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4 relative group">
          <p className="text-sm font-medium text-slate-600 italic leading-relaxed text-center">
            "{preCheckInQuote}"
          </p>
          {preCheckInSnippet && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
              <button
                type="button"
                onClick={() => handleSnippetInteraction(preCheckInSnippet!.id, 'like')}
                className={`p-1 rounded-full transition-colors ${preCheckInSnippet.likedBy?.includes(user.id) ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
              >
                <svg className="w-4 h-4" fill={preCheckInSnippet.likedBy?.includes(user.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div className="w-px bg-slate-200"></div>
              <button
                type="button"
                onClick={() => handleSnippetInteraction(preCheckInSnippet!.id, 'pass')}
                className={`p-1 rounded-full transition-colors ${preCheckInSnippet.passedBy?.includes(user.id) ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 0. Day Plan & Wearable Score */}
      <div className="space-y-4">
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
          <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">Today's Plan</p>
          <div className="grid grid-cols-2 gap-2">
            {(['TRAINING', 'COMPETITION', 'TRAVEL', 'REST'] as SessionType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setData({ ...data, sessionType: type })}
                className={`py-3 px-4 rounded-xl text-[10px] font-black transition-all ${
                  data.sessionType === type 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {(data.sessionType === 'TRAINING' || data.sessionType === 'COMPETITION') && (
          <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">Mission Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MISSION_BENCHMARKS) as PlannedMissionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setData({ ...data, plannedMissionType: type })}
                  className={`py-3 px-4 rounded-xl text-[10px] font-black transition-all ${
                    data.plannedMissionType === type 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {user.hasWearable && (
          <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">Wearable Recovery</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">What does your device suggest?</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setData({ ...data, wearableScore: data.wearableScore === null ? 5 : null })}
                  className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${data.wearableScore === null ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {data.wearableScore === null ? 'Data Off' : 'No Data'}
                </button>
                <div className={`text-2xl font-black ${data.wearableScore === null ? 'text-slate-200' : 'text-indigo-600'}`}>
                  {data.wearableScore === null ? '--' : data.wearableScore}
                </div>
              </div>
            </div>
            <div className={data.wearableScore === null ? 'opacity-20 pointer-events-none' : ''}>
              <input 
                type="range" min="1" max="10" step="1"
                value={data.wearableScore || 5}
                onChange={e => setData({ ...data, wearableScore: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <span>Poor</span>
                <span>Optimal</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Yesterday's Perceived Effort (Mandatory) */}
      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-900">Yesterday's Effort</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Rate 1-10 (0 = Rest Day)</p>
          </div>
          <div className={`text-2xl font-black ${data.lastSessionRPE === 0 ? 'text-slate-300' : 'text-indigo-600'}`}>
            {data.lastSessionRPE === 0 ? 'REST' : data.lastSessionRPE}
          </div>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10" 
          step="1" 
          required
          value={data.lastSessionRPE} 
          onChange={e => setData({...data, lastSessionRPE: parseInt(e.target.value)})} 
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
        />
        <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
          <span>Off Day</span>
          <span>Max Effort</span>
        </div>
      </div>

      {/* 2. Energy/Fatigue (Mandatory) */}
      <SliderQuestion label="Energy / Fatigue" value={data.energy} minLabel="Exhausted" maxLabel="Peak" onChange={(v: number) => setData({...data, energy: v})} />

      {/* 3. Sleep Hours & Quality (Mandatory) */}
      <div className="space-y-4 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <p className="font-bold text-slate-900">Sleep Stats</p>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            placeholder="Hours" 
            required
            step="0.5"
            value={data.sleepHours}
            onChange={e => setData({...data, sleepHours: e.target.value})}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center font-black text-indigo-600 outline-none focus:ring-4 focus:ring-indigo-50"
          />
          <div className="w-full space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase text-center">Quality: {data.sleepQuality}/7</p>
            <input 
              type="range" min="1" max="7" value={data.sleepQuality} 
              onChange={e => setData({...data, sleepQuality: parseInt(e.target.value)})}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 4. Muscle Freshness (1=Sore, 7=None) */}
      <SliderQuestion label="Muscle Freshness" value={data.soreness} minLabel="High (Sore)" maxLabel="None (Fresh)" onChange={(v: number) => setData({...data, soreness: v})} />

      {/* 5. Stress Management (1=High, 7=None) */}
      <SliderQuestion label="Stress Management" value={data.stress} minLabel="High Stress" maxLabel="Calm/Resilient" onChange={(v: number) => setData({...data, stress: v})} />

      {/* 6. Mood / Social */}
      <SliderQuestion label="Mood / Social" value={data.social} minLabel="Irritable" maxLabel="Great" onChange={(v: number) => setData({...data, social: v})} />

      {/* 7-9. Biological Flags (Yes/No Toggles) */}
      <div className="space-y-3">
        <ToggleSwitch label="Feeling Sick?" value={data.feelingSick} onChange={v => setData({...data, feelingSick: v})} />
        <ToggleSwitch label="Injured?" value={data.injured} onChange={v => setData({...data, injured: v})} />
        <ToggleSwitch label="Menstrual Cycle?" value={data.menstrualCycle} onChange={v => setData({...data, menstrualCycle: v})} />
      </div>

      {/* 10. Comments */}
      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <p className="font-bold text-slate-900 mb-4">Notes</p>
        <textarea 
          placeholder="Anything your coach should know? Anything new, different or feels funky? (Notes on other things welcomed too.)"
          value={data.comments}
          onChange={e => setData({...data, comments: e.target.value})}
          className="w-full h-24 bg-slate-50 p-4 rounded-2xl outline-none text-sm font-medium text-slate-600 resize-none border border-slate-100 focus:border-indigo-200 transition-all"
        />
      </div>

      <button type="submit" disabled={loading} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl shadow-indigo-100 active:scale-95 transition-transform">
        {loading ? 'TRANSMITTING...' : 'SUBMIT AUDIT'}
      </button>
    </form>
  );
};

export default WellnessForm;
