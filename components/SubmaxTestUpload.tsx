import React, { useState } from 'react';
import { fitParserService } from '../services/fitParserService';
import { storageService } from '../services/storageService';
import { User } from '../types';

const SubmaxTestUpload = ({ user, onComplete, onCancel }) => {
  const [mode, setMode] = useState('bike');
  const [targetHr, setTargetHr] = useState(180 - 30);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const fitData = await fitParserService.parseFitFile(file);
      const analysis = mode === 'run' 
        ? fitParserService.analyzeTreadmillRun(fitData, file.name)
        : fitParserService.analyzeBikeSubmax(fitData, file.name, targetHr);

      await storageService.saveSubmaxTest({ userId: user.id, ...analysis });
      onComplete();
    } catch (err) {
      setError(err.message || "Failed to process FIT file.");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-8">
      <h2 className="text-2xl font-black text-slate-900">Submax Test Upload</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setMode('bike')} className={`py-4 rounded-2xl font-black ${mode === 'bike' ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>BIKE</button>
          <button type="button" onClick={() => setMode('run')} className={`py-4 rounded-2xl font-black ${mode === 'run' ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>RUN</button>
        </div>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full p-4 border-2 border-dashed rounded-2xl" />
        <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black">
          {loading ? "ANALYZING..." : "PROCESS TEST"}
        </button>
      </form>
    </div>
  );
};
