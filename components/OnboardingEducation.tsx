
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Info, Zap, Wind, ShieldCheck } from 'lucide-react';

interface Concept {
  header: string;
  body: React.ReactNode;
  icon: React.ReactNode;
}

const CONCEPTS: Concept[] = [
  {
    header: "Your Wearable Optical Sensor Is Gaslighting You.",
    body: (
      <>
        Your optical sensor is a remarkable piece of engineering, but it is fundamentally limited. These devices rely on Photoplethysmography (PPG)—using light to measure blood flow.
        <br /><br />
        The reality? Peer-reviewed research shows that wrist-based sensors can have <span className="text-white font-black">error rates exceeding 20%</span> during high-intensity movement due to 'motion artifacts.' Even worse, studies have shown energy expenditure (calorie) estimates can be <span className="text-white font-black">off by as much as 40-80%</span> depending on the activity.
        <br /><br />
        They poorly measure objectivity; they cannot measure the human. When your sensor says 'Green' but your body is screaming 'Red,' that is a <span className="text-indigo-400 font-black">Divergence</span>. Learning to spot when you're being <span className="text-indigo-400 font-black">gaslit by your hardware</span> is why you're here.
      </>
    ),
    icon: <Info className="w-8 h-8 text-indigo-400" />,
  },
  {
    header: "Stop Being Measured Against the Average.",
    body: (
      <>
        Many wearables on the market compare you to a population average. Their algorithms were built on 'big data' from other people.
        <br /><br />
        Elite performance and enhanced health doesn't work that way. We build readiness models around your <span className="text-white font-black">individual patterns</span>—because a '7/10 soreness' means something completely different for you than it does for the person next to you.
        <br /><br />
        PerHea doesn't care about the population. It cares about you. The next 7 days build a baseline that belongs entirely to your <span className="text-indigo-400 font-black">unique biology</span>.
      </>
    ),
    icon: <Zap className="w-8 h-8 text-amber-400" />,
  },
  {
    header: "The Turbulence Engine: Correlation and Volatility.",
    body: (
      <>
        Most apps give you a single wellness score or a flat recovery score. We look at the 'Weather' of your biology.
        <br /><br />
        We analyze <span className="text-white font-black">Correlation</span>: how your metrics move together. If your stress spikes while your energy drops, that’s a chaotic signal. We also measure <span className="text-white font-black">Volatility</span>: how much your system is swinging day-to-day.
        <br /><br />
        Think of it like a pilot reading weather. A single instrument or metric doesn't determine whether to fly; the relationship between wind, pressure, and visibility does. Your Turbulence state synthesizes these into one of four honest commands: <span className="text-indigo-400 font-black">Build, Adapt, Restoration, or Caution</span>.
      </>
    ),
    icon: <Wind className="w-8 h-8 text-emerald-400" />,
  },
  {
    header: "The Pattern Library: Depth That Evolves With You.",
    body: (
      <>
        We don't believe in 'Laws' set in stone. We believe in <span className="text-white font-black">Depth</span>.
        <br /><br />
        The system is constantly running a multi-layered analysis of your history. We look at <span className="text-white font-black">Acute Snapshots</span>, <span className="text-white font-black">Short-Term Cycles</span>, <span className="text-white font-black">Seasonal Shifts</span>, and <span className="text-indigo-400 font-black">Long-Term Biological Trends</span>.
        <br /><br />
        By cross-referencing these different time horizons simultaneously, we'll find subtle, individual patterns that no wearable ever will. The longer you stay, the <span className="text-indigo-400 font-black">deeper the library grows</span>. The baseline starts now.
      </>
    ),
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
