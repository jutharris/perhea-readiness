import React, { useState, useEffect } from 'react';
import { WellnessEntry, UserRole, PersonalityCalibration, InteractionType } from '../types';
import { getAthleteAnalysis, getAthleteInteraction } from '../services/geminiService';

const Insights: React.FC<{ entries: WellnessEntry[]; role?: UserRole; personalityCalibration?: PersonalityCalibration }> = ({ 
  entries, 
  role = 'ATHLETE',
  personalityCalibration = 'BALANCED'
}) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactionResponse, setInteractionResponse] = useState<string | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [showInput, setShowInput] = useState<InteractionType | null>(null);
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    if (entries.length > 0) {
      const latestId = entries[0].id;
      
      // Get or create a session ID that persists only for the current browser session
      let sessionId = sessionStorage.getItem('ai_session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(7);
        sessionStorage.setItem('ai_session_id', sessionId);
      }
      
      // Create a unique cache key based on the latest entry, user role, personality, and session
      const cacheKey = `ai_insight_${latestId}_${role}_${personalityCalibration}_${sessionId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setAnalysis(cached);
        return;
      }

      setLoading(true);

      const personalityDirectives = {
        STOIC: "This athlete is STOIC. They under-report pain and fatigue. If they report any dip at all, prioritize it as a significant physiological event. Be highly sensitive to small changes.",
        BALANCED: "This athlete is BALANCED. Their reporting is generally reliable and proportional to their state.",
        EXPRESSIVE: "This athlete is EXPRESSIVE. They report based on current mood and 'vibes', which can be volatile. Filter for the signal within the noise; do not overreact to single-day swings."
      }[personalityCalibration] || "";

      const systemInstruction = `You are an AI Assistant Coach for a high-performance athlete. 
      Your tone is supportive, calm, and educational. 
      ${personalityDirectives}
      Do not be overly reactive to single-day dips unless the personality calibration suggests otherwise. 
      Focus on long-term trends and provide physiological context without being overly technical or prescriptive.
      Keep your response concise (2-3 sentences).
      Avoid definitive medical judgments.`;

      getAthleteAnalysis(entries, role, systemInstruction).then(res => {
        setAnalysis(res);
        localStorage.setItem(cacheKey, res);
        setLoading(false);
      });
    }
  }, [entries, role, personalityCalibration]);

  const handleInteraction = async (type: InteractionType, message?: string) => {
    setInteractionLoading(true);
    setInteractionResponse(null);
    try {
      const resJson = await getAthleteInteraction(entries, type, message, personalityCalibration);
      const res = JSON.parse(resJson);
      setInteractionResponse(res.text);
      if (res.inflectionPoint) {
        localStorage.setItem('ai_inflection_point', JSON.stringify(res.inflectionPoint));
        // Dispatch custom event to notify Trends tab
        window.dispatchEvent(new CustomEvent('ai_inflection_updated'));
      }
      setShowInput(null);
      setUserInput('');
    } catch (err) {
      setInteractionResponse("I'm having trouble processing that request right now.");
    } finally {
      setInteractionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4 relative overflow-hidden">
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Assistant Coach</h3>
        {loading ? (
          <div className="h-12 flex items-center">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-white/90 leading-relaxed italic">"{analysis}"</p>
            
            {interactionResponse && (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-medium text-indigo-200 leading-relaxed">
                  {interactionResponse}
                </p>
              </div>
            )}

            {interactionLoading && (
              <div className="flex items-center gap-2 py-2">
                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Processing...</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button 
                onClick={() => handleInteraction('EXPLAIN_LOGIC')}
                disabled={interactionLoading}
                className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-indigo-400 transition-colors"
              >
                Explain Logic
              </button>
              <button 
                onClick={() => setShowInput('ADD_CONTEXT')}
                disabled={interactionLoading}
                className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-indigo-400 transition-colors"
              >
                Add Context
              </button>
              <button 
                onClick={() => setShowInput('DATA_QUERY')}
                disabled={interactionLoading}
                className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-indigo-400 transition-colors"
              >
                Data Query
              </button>
            </div>

            {showInput && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <textarea 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={showInput === 'ADD_CONTEXT' ? "e.g., 'I had a late flight' or 'Work is peaking'..." : "e.g., 'What was my avg sleep hours last month?'..."}
                  className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleInteraction(showInput, userInput)}
                    className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest"
                  >
                    Send
                  </button>
                  <button 
                    onClick={() => { setShowInput(null); setUserInput(''); }}
                    className="px-4 py-2 bg-white/5 text-white/40 text-[10px] font-black rounded-lg uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;
