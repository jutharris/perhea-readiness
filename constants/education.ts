import { Regime } from '../types';

export const PRE_CHECK_IN_PRIMES = [
  "Hardware measures the physiological cost of yesterday. Your subjective perception dictates the capacity for today.",
  "Your wearable measures the cost of yesterday's work. Your perception dictates the capacity for today's.",
  "Oura and Whoop guess your readiness based on algorithms. Your central nervous system already knows the answer. Calibrate it here.",
  "A single data point is noise. 30 consecutive days is a baseline. 90 days is a predictive model. Make today's deposit.",
  "Don't outsource your intuition to a piece of plastic on your wrist. Quantify your qualitative state.",
  "Recent literature indicates subjective readiness questionnaires often out-predict hardware biometrics for CNS fatigue.",
  "Consistency creates the baseline. The baseline reveals the signal. The signal dictates the adaptation."
];

export const POST_SUBMIT_SEQUENCE = [
  "Encrypting subjective inputs...",
  "Filtering wearable noise...",
  "Cross-referencing historical baselines...",
  "Calculating biological compounding...",
  "Generating coaching directives..."
];

export const REGIME_PHILOSOPHIES: Record<Regime, string[]> = {
  BUILD: [
    "Peak states are not accidental. Today's readiness is the lagging indicator of the biological deposits you made 72 hours ago.",
    "High capacity is the yield of high consistency. The baseline you built is currently paying dividends."
  ],
  ADAPT: [
    "Average days are the load-bearing walls of your physiology. You are raising the floor.",
    "True progress isn't raising your maximum; it's raising your average. The baseline is compounding."
  ],
  RESTORATION: [
    "A suppressed nervous system isn't failing; it is actively absorbing load. The valley is where the adaptation is written.",
    "Fitness is built during the work, but expressed during the restoration. Yielding is a weapon."
  ],
  CAUTION: [
    "Data is objective; your narrative about the data is a choice. A low score is just a coordinate, not a conclusion.",
    "Zoom out. On a 90-day horizon, today's acute fatigue is a statistical blip. The algorithm requires valleys to build peaks."
  ],
  CALIBRATING: [
    "Hardware measures the physiological cost of yesterday. Your subjective perception dictates the capacity for today.",
    "Consistency is the ultimate performance enhancer. You are currently building a high-fidelity map of your nervous system."
  ]
};
