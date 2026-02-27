
import React, { useState, useEffect } from 'react';
import { fitParserService } from '../services/fitParserService';
import { storageService } from '../services/storageService';
import { User } from '../types';

interface Props {
  user: User;
  onComplete: () => void;
  onCancel: () => void;
}

const SubmaxTestUpload: React.FC<Props> = ({ user, onComplete, onCancel }) => {
  const [mode, setMode] = useState<'bike' | 'run'>('bike');
  const [targetHr, setTargetHr] = useState<number>(150);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate Target HR based on age and mode
  useEffect(() => {
    if (user.birthDate) {
      const birth = new Date(user.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      // Protocol: 180 - Age for Run, 170 - Age for Bike
      setTargetHr(mode === 'run' ? 180 - age : 170 - age);
    }
  }, [user.birthDate, mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const fitData = await fitParserService.parseFitFile(file);
      let analysis;
      
      if (mode === 'run') {
        analysis = fitParserService.analyzeTreadmillRun(fitData, file.name, targetHr);
      } else {
        analysis = fitParserService.analyzeBikeSubmax(fitData, file.name, targetHr);
      }

      await storageService.saveSubmaxTest({
        userId: user.id,
        ...analysis
      });

      onComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process FIT file. Ensure it matches the test protocol.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900">Aerobic Calibration</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => setMode('bike')}
            className={`py-4 rounded-2xl font-black text-xs transition-all ${mode === 'bike' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
          >
            BIKE (30 MIN)
          </button>
          <button 
            type="button"
            onClick={() => setMode('run')}
            className={`py-4 rounded-2xl font-black text-xs transition-all ${mode === 'run' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
          >
            RUN (3 MILES)
          </button>
        </div>

        {mode === 'bike' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Heart Rate (BPM)</label>
            <input 
              type="number" 
              value={targetHr} 
              onChange={e => setTargetHr(Number(e.target.value))}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 transition-all"
            />
            <p className="text-[10px] text-slate-400 italic">Protocol: 170 - Age. Stable for 60s to start.</p>
          </div>
        )}

        {mode === 'run' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Heart Rate (BPM)</label>
            <input 
              type="number" 
              value={targetHr} 
              onChange={e => setTargetHr(Number(e.target.value))}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-slate-900 transition-all"
            />
            <p className="text-[10px] text-slate-400 italic">Protocol: 180 - Age. Stable for 60s to start.</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select .FIT or .FIT.GZ File</label>
          <div className="relative">
            <input 
              type="file" 
              accept=".fit,.gz" 
              onChange={handleFileChange}
              className="hidden" 
              id="fit-upload"
            />
            <label 
              htmlFor="fit-upload"
              className="flex flex-col items-center justify-center w-full p-10 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <span className="text-sm font-bold text-slate-600">{file ? file.name : "Drop FIT file here"}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">or click to browse</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={!file || loading}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {loading ? "ANALYZING PROTOCOL..." : "PROCESS TEST DATA"}
        </button>
      </form>
    </div>
  );
};

export default SubmaxTestUpload;
