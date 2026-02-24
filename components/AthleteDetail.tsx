import React, { useState, useEffect } from 'react';
import { User, WellnessEntry, SubmaxTest } from '../types';
import Dashboard from './Dashboard';
import Insights from './Insights';
import { storageService } from '../services/storageService';

const AthleteDetail: React.FC<any> = ({ athlete, entries, coachId, onBack }) => {
  const [msg, setMsg] = useState('');
  const [tests, setTests] = useState<SubmaxTest[]>([]);
  const [loading, setLoading] = useState(true);

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

  const send = async () => { 
    await storageService.saveAdjustment(athlete.id, coachId, msg); 
    setMsg(''); 
    alert('Sent'); 
  };

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-xs font-black text-slate-400 uppercase tracking-widest">← Back</button>
      <h2 className="text-4xl font-black text-slate-900">{athlete.firstName} {athlete.lastName}</h2>
      
      <Dashboard entries={entries} user={athlete} onNewReport={() => {}} hideAction />
      
      {tests.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-slate-900">Submax Performance</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Objective Physiological Markers</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {tests.map(test => (
              <div key={test.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded uppercase tracking-widest">{test.sport}</span>
                    <p className="text-xs font-bold text-slate-500 mt-1">{new Date(test.createdAt).toLocaleDateString()}</p>
                  </div>
                  {test.summary?.eff_change_pct_seg3_vs_seg1 !== undefined && (
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drift (Seg 3 vs 1)</p>
                      <p className={`text-lg font-black ${test.summary.eff_change_pct_seg3_vs_seg1 < -5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {test.summary.eff_change_pct_seg3_vs_seg1.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
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
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                    <p className="text-sm font-black text-slate-900">
                      {test.sport === 'bike' ? (test.summary?.power_avg / test.summary?.hr_avg).toFixed(2) : '---'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
