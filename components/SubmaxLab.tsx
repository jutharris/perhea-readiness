
import React from 'react';
import { SubmaxTest, User } from '../types';

interface SubmaxLabProps {
  user: User;
  tests: SubmaxTest[];
  onNewTest: () => void;
}

const SubmaxLab: React.FC<SubmaxLabProps> = ({ user, tests, onNewTest }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div className="text-left">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SubMax Lab</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Objective Physiological Mirror</p>
        </div>
        {tests.length > 0 && (
          <button 
            onClick={onNewTest}
            className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <span className="text-2xl font-bold">+</span>
          </button>
        )}
      </div>

      {tests.length === 0 ? (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-xl text-center space-y-8">
          <div className="space-y-4 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Calibrate Your Engine</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              The SubMax Lab measures your physiological "MPG." By tracking heart rate at a fixed intensity, we remove the guesswork and see exactly how your engine is performing.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Run Protocol</h4>
              <p className="text-xs font-bold text-slate-600">3 Miles at fixed HR. Use lap button for each mile.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Bike Protocol</h4>
              <p className="text-xs font-bold text-slate-600">30 Minutes at fixed HR. Maintain steady cadence.</p>
            </div>
          </div>

          <button 
            onClick={onNewTest}
            className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99] transition-all text-lg uppercase tracking-widest"
          >
            Start First Calibration
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-4 border border-white/5">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black uppercase tracking-widest">Lab Status: Mission Control</h3>
            </div>
            <p className="text-sm font-medium opacity-70 leading-relaxed">
              Your aerobic floor is currently being tracked. The system monitors your pace and power at a fixed heart rate to measure true metabolic efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tests.map((test, idx) => {
              const compliance = test.summary?.compliance || 'COMPLIANT';
              const isNonCompliant = compliance === 'NON_COMPLIANT';
              
              return (
                <div key={test.id} className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-colors ${isNonCompliant ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(test.createdAt).toLocaleDateString()}</p>
                        {compliance === 'WARNING' && (
                          <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Warning</span>
                        )}
                        {compliance === 'NON_COMPLIANT' && (
                          <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Invalid</span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase">{test.sport} Calibration</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        Target: {test.summary?.target_hr} bpm | Avg: {Math.round(test.summary?.hr_avg)} bpm
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aerobic Floor</p>
                    <p className="text-xl font-black text-indigo-600">
                      {test.sport === 'bike' ? 
                        `${Math.round(test.summary?.power_avg)}W` : 
                        test.summary?.split_range_mmss}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100/50">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 italic">Lab Note</p>
        <p className="text-xs font-bold text-indigo-700 leading-relaxed">
          Calibration tests are best performed in a rested state (BUILD or ADAPT regime) to ensure the data reflects your true aerobic ceiling.
        </p>
      </div>
    </div>
  );
};

export default SubmaxLab;
