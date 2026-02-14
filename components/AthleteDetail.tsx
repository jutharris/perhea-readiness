import React, { useState } from 'react';
import { User, WellnessEntry } from '../types';
import Dashboard from './Dashboard';
import Insights from './Insights';
import { storageService } from '../services/storageService';

const AthleteDetail: React.FC<any> = ({ athlete, entries, coachId, onBack }) => {
  const [msg, setMsg] = useState('');
  const send = async () => { await storageService.saveAdjustment(athlete.id, coachId, msg); setMsg(''); alert('Sent'); };
  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-xs font-black text-slate-400 uppercase tracking-widest">← Back</button>
      <h2 className="text-4xl font-black text-slate-900">{athlete.firstName} {athlete.lastName}</h2>
      <Dashboard entries={entries} user={athlete} onNewReport={() => {}} hideAction />
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
