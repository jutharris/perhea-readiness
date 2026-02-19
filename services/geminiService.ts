
import { GoogleGenAI } from "@google/genai";
import { WellnessEntry, User, UserRole } from "../types";

/**
 * Returns a GoogleGenAI instance initialized with the API key from environment.
 */
const getAIInstance = () => {
  if (!process.env.API_KEY || process.env.API_KEY === 'undefined') return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Analyzes individual athlete wellness data using a Turbulence Model (Multivariate Decoupling).
 * Uses a 50-day baseline to establish "Normal Regimes."
 */
export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE') => {
  if (entries.length < 5) return "Establishing your 50-day performance baseline. Continue consistent reporting.";
  
  const ai = getAIInstance();
  if (!ai) return "Performance Partner offline.";
  
  // Ingest up to 50 days of history to find long-term correlations
  const contextData = entries.slice(0, 50);
  
  const prompt = `
    Act as a Performance Scientist specializing in Multivariate Turbulence Models (Mahalanobis Distance logic).
    Review the last 50 entries of athlete data: ${JSON.stringify(contextData)}.
    
    CORE OBJECTIVE: 
    Identify "Biological Turbulence"—when the historical relationship (correlation) between metrics breaks. 
    Focus on "Decoupling" rather than just low scores.

    PATTERN RECOGNITION PARAMETERS:
    1. THE 50-DAY BASELINE: Establish what "Normal" looks like. For this athlete, do Energy and Soreness usually move together? 
    2. TURBULENCE DETECTION: 
       - Look for "Decoupling": e.g., Energy drops significantly while Soreness remains "Fresh" (High). This is a classic "Biological Regime Shift" indicating systemic stress or early-stage illness.
       - Look for the "Menstrual Ghost": A specific 4-day decoupling of Stress/Sleep Quality vs. Energy prior to a cycle start.
    3. THE "SUBTLE" PHILOSOPHY: 
       - No "Danger" or "Alerts." 
       - Use "iPhone-style" clarity: subtle, professional, and slightly addictive because it's so accurate.
       - Provide "Permission to Rest" if turbulence is high and scores are dropping.
       - Provide "Confidence to Push" if metrics are stable despite high load.

    OUTPUT STYLE:
    - 2 sentences of high-density insight.
    - Avoid technical jargon like "Mahalanobis" or "Covariance" in the output to the athlete. 
    - Use the role context: ${role}.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt 
    });
    return response.text || "Metrics are within your 50-day adaptive range.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Maintaining stable protocol based on current readiness.";
  }
};

/**
 * Analyzes squad data for coaching staff using Regime Shift detection.
 */
export const getCoachDailyBriefing = async (athletes: User[], allEntries: WellnessEntry[]) => {
  if (athletes.length === 0) return "No athletes in squad.";
  
  const ai = getAIInstance();
  if (!ai) return "Squad briefing unavailable.";
  
  const prompt = `
    Act as a Head of Performance. Review the squad's 50-day data window.
    Identify individuals experiencing "Regime Shifts" (High Turbulence).
    
    Categorize feedback:
    - STABLE ADAPTATION: Athletes whose metrics are trending predictably with training load.
    - REGIME SHIFTS: Athletes whose internal correlation (e.g., Sleep vs. Energy) has decoupled unexpectedly. These are "Early Signals" for intervention.
    
    Keep it brief, clinical, and actionable. Data: ${JSON.stringify(allEntries.slice(0, 50))}.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-pro-preview", 
      contents: prompt 
    });
    return response.text || "Squad adaptation is stable across all primary vectors.";
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return "Manual review of individual turbulence flags recommended.";
  }
};
