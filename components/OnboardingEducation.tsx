
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Info, Zap, Wind, ShieldCheck } from 'lucide-react';

interface Concept {
  header: string;
  body: string;
  icon: React.ReactNode;
}

const CONCEPTS: Concept[] = [
  {
    header: "Your Watch Is Lying To You. Not On Purpose.",
    body: "Your Garmin, WHOOP, or Apple Watch is a remarkable piece of engineering. It measures your pulse, estimates your HRV, and tells you whether to train or rest.\n\nThere's one problem. It has no idea how you feel.\n\nPeer-reviewed sports science has known this for decades: the most accurate predictor of athletic breakdown isn't heart rate variability — it's perceived exertion, mood, stress, and sleep quality, reported by you. These are signals your watch's optical sensor physically cannot detect.\n\nThe result? Thousands of athletes every year train into injury because their watch said 'green' while their body was screaming 'red.' We call this a Divergence. Learning to spot yours is why you're here.",
    icon: <Info className="w-8 h-8 text-indigo-400" />,
  },
  {
    header: "You Are Not The Average Athlete. Stop Being Measured Like One.",
    body: "Every wearable on the market compares you to a population average. Their algorithms were built on other people's data.\n\nElite sports programs don't work that way. They build readiness models around the individual athlete — because a '7/10 soreness' means something completely different for you than it does for the person next to you at the start line.\n\nPerHea doesn't have a population. It has you. The next 7 days build a baseline that belongs entirely to your biology.",
    icon: <Zap className="w-8 h-8 text-amber-400" />,
  },
  {
    header: "Forget Wellness Scores. You Have A Turbulence Rating.",
    body: "Most apps give you a number. 74% recovered. 8.2 sleep score. These numbers feel precise. They aren't.\n\nPerHea gives you a Turbulence state — a readiness classification built from the pattern of your inputs, not a single metric.\n\nThink of it like a pilot reading weather. A single instrument doesn't determine whether to fly. The full picture does — wind, visibility, pressure, the pilot's own judgment.\n\nYour Turbulence state synthesizes Energy, Stress, Sleep, and Soreness into one honest signal: Adapt, Build, or Restoration. Not a score. A command.",
    icon: <Wind className="w-8 h-8 text-emerald-400" />,
  },
  {
    header: "In 7 Days, The System Will Know Something About You That No Wearable Ever Will.",
    body: "A Bio Law is a personalized readiness rule written entirely from your own data.\n\nExample: 'When Athlete A reports high soreness for 3 consecutive days alongside elevated stress, their RPE runs 2 points above plan regardless of HRV.' That's not an algorithm. That's your biology, codified.\n\nMost athletes spend entire careers never knowing their own patterns this precisely. Your first Bio Law reveals after your 7th entry. The baseline starts now.",
    icon: <ShieldCheck className="w-8 h-8 text-indigo-400" />,
  }
];

const OnboardingEducation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < CONCEPTS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      onComplete();
    }
  };

  const concept = CONCEPTS[currentStep];

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col">
      {/* Progress Bars - Fixed at top */}
      <div className="flex gap-1 px-4 pt-6 pb-4 bg-slate-950/80 backdrop-blur-md z-10">
        {CONCEPTS.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: idx <= currentStep ? '100%' : '0%' }}
              transition={{ duration: 0.5 }}
              className={`h-full ${idx === currentStep ? 'bg-indigo-500' : 'bg-slate-600'}`}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-8 pb-12 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-8 p-4 bg-slate-900/50 rounded-2xl w-fit border border-slate-800">
              {concept.icon}
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Concept {currentStep + 1}</p>
                <h2 className="text-3xl font-black text-white italic uppercase leading-tight tracking-tight">
                  {concept.header}
                </h2>
              </div>

              <div className="text-slate-400 font-medium leading-relaxed text-lg whitespace-pre-wrap pb-8">
                {concept.body}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="pt-4">
          <button 
            onClick={next}
            className="w-full py-6 bg-white text-slate-950 font-black rounded-[2.5rem] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-white/5"
          >
            {currentStep === CONCEPTS.length - 1 ? 'BEGIN MY BASELINE' : 'CONTINUE'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingEducation;
