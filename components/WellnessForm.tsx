
import React, { useState } from 'react';
import SliderQuestion from './SliderQuestion';
import { storageService } from '../services/storageService';

const WellnessForm: React.FC<any> = ({ user, onComplete }) => {
  const [data, setData] = useState({ 
    sessionType: 'TRAINING', 
    lastSessionRPE: 5, 
    energy: 4, 
    soreness: 4, 
    sleepQuality: 4, 
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
    setLoading(true);
    try {
      await storageService.saveEntry({ ...data, userId: user.id, sleepHours: 8 });
      onComplete();
    } catch (err) {
      alert("Error saving report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto space-y-6 pb-20">
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-3xl font-black text-slate-900 italic uppercase">Daily Audit</h2>
        <p className="text-sm font-bold text-slate-400">Hooper-Mackinnon Protocol</p>
      </div>

      {/* 1. Yesterday's Perceived Effort */}
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
          value={data.lastSessionRPE} 
          onChange={e => setData({...data, lastSessionRPE: parseInt(e.target.value)})} 
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
        />
        <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
          <span>Off Day</span>
          <span>Max Effort</span>
        </div>
      </div>

      {/* 2-6. Hooper-Mackinnon Scales */}
      <SliderQuestion label="Energy / Fatigue" value={data.energy} minLabel="Exhausted" maxLabel="Peak" onChange={(v: number) => setData({...data, energy: v})} />
      <SliderQuestion label="Sleep Quality" value={data.sleepQuality} minLabel="Restless" maxLabel="Perfect" onChange={(v: number) => setData({...data, sleepQuality: v})} />
      <SliderQuestion label="Muscle Soreness" value={data.soreness} minLabel="Very Sore" maxLabel="None" onChange={(v: number) => setData({...data, soreness: v})} />
      <SliderQuestion label="Stress Levels" value={data.stress} minLabel="None" maxLabel="High" onChange={(v: number) => setData({...data, stress: v})} />
      <SliderQuestion label="Mood / Social" value={data.social} minLabel="Irritable" maxLabel="Great" onChange={(v: number) => setData({...data, social: v})} />

      {/* 7-9. Biological Flags */}
      <div className="grid grid-cols-1 gap-3 p-2">
        <button 
          type="button" 
          onClick={() => setData({...data, feelingSick: !data.feelingSick})}
          className={`w-full py-4 rounded-2xl font-black text-xs border-2 transition-all flex justify-between px-6 items-center ${data.feelingSick ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          <span>FEELING SICK?</span>
          <span className="text-lg">{data.feelingSick ? '✓' : '○'}</span>
        </button>
        <button 
          type="button" 
          onClick={() => setData({...data, injured: !data.injured})}
          className={`w-full py-4 rounded-2xl font-black text-xs border-2 transition-all flex justify-between px-6 items-center ${data.injured ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          <span>INJURED?</span>
          <span className="text-lg">{data.injured ? '✓' : '○'}</span>
        </button>
        <button 
          type="button" 
          onClick={() => setData({...data, menstrualCycle: !data.menstrualCycle})}
          className={`w-full py-4 rounded-2xl font-black text-xs border-2 transition-all flex justify-between px-6 items-center ${data.menstrualCycle ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          <span>MENSTRUAL CYCLE?</span>
          <span className="text-lg">{data.menstrualCycle ? '✓' : '○'}</span>
        </button>
      </div>

      {/* 10. Comments */}
      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <p className="font-bold text-slate-900 mb-4">Comments</p>
        <textarea 
          placeholder="Anything your coach should know? (Notes on intensity, pain, or life...)"
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
