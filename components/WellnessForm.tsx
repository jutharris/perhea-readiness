
import React, { useState } from 'react';
import SliderQuestion from './SliderQuestion';
import { storageService } from '../services/storageService';
import { User } from '../types';

const WellnessForm: React.FC<{ user: User; onComplete: () => void }> = ({ user, onComplete }) => {
  const [data, setData] = useState({ sessionType: 'TRAINING', lastSessionRPE: 5, energy: 4, soreness: 4, sleepHours: 8, sleepQuality: 4, stress: 4, social: 4, feelingSick: false, injured: false, comments: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await storageService.saveEntry({ ...data, userId: user.id });
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-md mx-auto">
      <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center">Daily Report</h2>
      <SliderQuestion label="Yesterday's Effort" description="RPE Scale (1-10)" value={data.lastSessionRPE} max={10} minLabel="Easy" maxLabel="Max" onChange={v => setData(d => ({ ...d, lastSessionRPE: v }))} />
      <SliderQuestion label="Energy" description="Vitality" value={data.energy} minLabel="Low" maxLabel="Peak" onChange={v => setData(d => ({ ...d, energy: v }))} />
      <SliderQuestion label="Soreness" description="Tissue State" value={data.soreness} minLabel="High" maxLabel="None" onChange={v => setData(d => ({ ...d, soreness: v }))} />
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100"><p className="text-sm font-bold mb-4">Sleep Hours</p><input type="number" value={data.sleepHours} onChange={e => setData(d => ({ ...d, sleepHours: parseFloat(e.target.value) }))} className="w-full p-4 bg-slate-50 rounded-2xl text-center text-2xl font-black" /></div>
      <button type="submit" disabled={submitting} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl">{submitting ? 'Submitting...' : 'Complete Daily Check'}</button>
    </form>
  );
};

export default WellnessForm;
