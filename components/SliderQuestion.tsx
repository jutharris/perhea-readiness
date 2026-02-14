
import React from 'react';

interface SliderQuestionProps {
  label: string;
  value: number;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
  max?: number;
}

const SliderQuestion: React.FC<SliderQuestionProps> = ({ label, value, minLabel, maxLabel, onChange, max = 7 }) => (
  <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
    <div className="flex justify-between items-center">
      <p className="font-bold text-slate-900">{label}</p>
      <div className="text-2xl font-black text-indigo-600">{value}</div>
    </div>
    <input 
      type="range" 
      min="1" 
      max={max} 
      step="1" 
      value={value} 
      onChange={e => onChange(parseInt(e.target.value))} 
      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
    />
    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
      <span>{minLabel}</span>
      <span>{maxLabel}</span>
    </div>
  </div>
);

export default SliderQuestion;
