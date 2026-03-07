import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { motion } from 'motion/react';
import { Save, Shield, Zap, Database, ArrowLeft } from 'lucide-react';

interface CreatorLabProps {
  onBack: () => void;
}

const CreatorLab: React.FC<CreatorLabProps> = ({ onBack }) => {
  const [soulDoc, setSoulDoc] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    storageService.getGlobalSoulDocument().then(doc => {
      setSoulDoc(doc);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await storageService.updateGlobalSoulDocument(soulDoc);
      setStatus('Soul Document Synchronized.');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus('Sync Failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-600" />
              Creator Lab
            </h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Master System Configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
          <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" />
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Admin Access Active</span>
        </div>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/5 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-4 h-4" />
              Master Soul Document
            </h3>
            {status && (
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                {status}
              </span>
            )}
          </div>
          
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            This document defines the core personality, philosophy, and decision-making logic for the entire PerHea AI. 
            Changes here are global and immediate. Tune with caution.
          </p>

          <textarea 
            value={soulDoc}
            onChange={(e) => setSoulDoc(e.target.value)}
            className="w-full h-96 bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-medium text-slate-200 outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
            placeholder="Define the AI's soul..."
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              SYNCHRONIZE GLOBAL DNA
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</p>
          <p className="text-xl font-black text-slate-900">OPERATIONAL</p>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Athletes</p>
          <p className="text-xl font-black text-slate-900">SYNCED</p>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Version</p>
          <p className="text-xl font-black text-slate-900">V3.1-PRO</p>
        </div>
      </div>
    </motion.div>
  );
};

export default CreatorLab;
