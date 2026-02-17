
import React, { useState } from 'react';
import SliderQuestion from './SliderQuestion';
import { storageService } from '../services/storageService';

const WellnessForm: React.FC<any> = ({ user, onComplete }) => {
  const [data, setData] = useState({ 
    sessionType: 'TRAINING', 
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.sleepHours || isNaN(Number(data.sleepHours))) {
      alert("Please enter a valid number for Sleep Hours.");
      return;
    }
    setLoading(true);
    try {
      await storageService.saveEntry({ ...data, userId: user.id, sleepHours: Number(data.sleepHours) });
      onComplete();
    } catch (err) {
      alert("Error saving report.");
    } finally {
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

  return (
    <form onSubmit={submit} className="max-w-md mx-auto space-y-6 pb-20">
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-3xl font-black text-slate-900 italic uppercase">Daily Audit</h2>
        <p className="text-sm font-bold text-slate-400">Biological Readiness Protocol</p>
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

      {/* 4. Muscle Soreness (Flipped: 1=Sore, 7=None) */}
      <SliderQuestion label="Muscle Soreness" value={data.soreness} minLabel="High (Sore)" maxLabel="None (Fresh)" onChange={(v: number) => setData({...data, soreness: v})} />

      {/* 5. Stress Levels (Flipped: 1=High, 7=None) */}
      <SliderQuestion label="Stress Levels" value={data.stress} minLabel="High" maxLabel="None" onChange={(v: number) => setData({...data, stress: v})} />

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
