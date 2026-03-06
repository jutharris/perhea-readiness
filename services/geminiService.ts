
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { WellnessEntry, User, UserRole } from "../types";

/**
 * Returns a GoogleGenAI instance initialized with the API key from environment.
 */
const getAIInstance = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes individual athlete wellness data using a Turbulence Model (Multivariate Decoupling).
 * Uses a progressive baseline to establish "Normal Regimes."
 */
export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE', systemInstruction?: string) => {
  if (entries.length === 0) return "Your insights get sharper every week. Keep reporting!";
  
  const ai = getAIInstance();
  if (!ai) return "Performance Partner offline.";
  
  // Progressive Lookback Logic
  const entryCount = entries.length;
  let lookback = 50;
  let calibrationNote = "";
  
  if (entryCount <= 7) {
    lookback = entryCount;
    calibrationNote = "System is in Initial Calibration Mode (Days 1-7). Focus on building baseline and establishing reporting consistency.";
  } else if (entryCount <= 14) {
    lookback = 7;
    calibrationNote = "System is in Binary Calibration Phase (Days 8-14). Only 'Adapting' or 'Restoration' regimes are active. Focus on broad system stability.";
  } else if (entryCount <= 29) {
    lookback = 14;
  } else if (entryCount <= 51) {
    lookback = 28;
  }
  
  const contextData = entries.slice(0, lookback).map(e => ({
    date: e.isoDate.split('T')[0],
    rpe: e.lastSessionRPE,
    energy: e.energy,
    soreness: e.soreness,
    sleep: e.sleepQuality,
    sleepHrs: e.sleepHours,
    stress: e.stress,
    sick: e.feelingSick,
    injured: e.injured,
    comments: e.comments
  }));
  
  const prompt = `
    Act as a Performance Scientist specializing in Multivariate Turbulence Models.
    Review the last ${lookback} entries of athlete data: ${JSON.stringify(contextData)}.
    
    CURRENT CALIBRATION PHASE: ${calibrationNote || "Full Baseline Established."}

    CORE OBJECTIVE: 
    Identify "Biological Turbulence"—when the historical relationship (correlation) between metrics breaks. 
    Focus on "Decoupling" rather than just low scores.

    PATTERN RECOGNITION PARAMETERS:
    1. THE BASELINE: Establish what "Normal" looks like for this ${lookback}-day window.
    2. TURBULENCE DETECTION: 
       - Look for "Decoupling": e.g., Energy drops significantly while Soreness remains "Fresh" (High). This indicates systemic stress.
       - Look for the "Menstrual Ghost": A specific 4-day decoupling of Stress/Sleep Quality vs. Energy prior to a cycle start.
    3. THE "SUBTLE" PHILOSOPHY: 
       - No "Danger" or "Alerts." 
       - Use "iPhone-style" clarity: subtle, professional.
       - Provide "Permission to Rest" if turbulence is high.
       - Provide "Confidence to Push" if metrics are stable.

    OUTPUT STYLE:
    - 2 sentences of high-density insight.
    - Avoid technical jargon.
    - Use the role context: ${role}.
    ${calibrationNote ? `- Acknowledge that you are still calibrating but provide the best insight possible.` : ""}
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: { 
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text || "Metrics are within your adaptive range.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // If it's a 404 or model not found, try a fallback model
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: prompt,
        config: { systemInstruction }
      });
      return fallbackResponse.text || "Maintaining stable protocol based on current metrics.";
    } catch (innerError) {
      return "Maintaining stable protocol based on current metrics.";
    }
  }
};

/**
 * Handles athlete interaction with the AI Assistant Coach.
 */
export const getAthleteInteraction = async (
  entries: WellnessEntry[], 
  type: 'EXPLAIN_LOGIC' | 'ADD_CONTEXT' | 'DATA_QUERY',
  userMessage?: string,
  personalityCalibration: string = 'BALANCED'
) => {
  const ai = getAIInstance();
  if (!ai) return "Interaction offline.";

  const entryCount = entries.length;
  const lookback = entryCount > 50 ? 50 : entryCount;
  const contextData = entries.slice(0, lookback).map(e => ({
    date: e.isoDate.split('T')[0],
    rpe: e.lastSessionRPE,
    energy: e.energy,
    soreness: e.soreness,
    sleep: e.sleepQuality,
    sleepHrs: e.sleepHours,
    stress: e.stress,
    sick: e.feelingSick,
    injured: e.injured,
    comments: e.comments
  }));

  let specificInstruction = "";
  if (type === 'EXPLAIN_LOGIC') {
    specificInstruction = `Explain the specific biological logic behind the current regime classification. Reference the volatility or decoupling of specific metrics in the data. 
    ALSO, identify the exact date (YYYY-MM-DD) when the system turbulence or trend shift first became apparent for the primary driver metric. 
    Format your response as a JSON object: { "text": "your explanation here", "inflectionPoint": { "metric": "metricKey", "date": "YYYY-MM-DD" } }`;
  } else if (type === 'ADD_CONTEXT') {
    specificInstruction = `The athlete has provided additional context: "${userMessage}". Acknowledge this context and explain how it might explain the current biological turbulence or why the system should adjust its sensitivity.
    Format your response as a JSON object: { "text": "your response here" }`;
  } else if (type === 'DATA_QUERY') {
    specificInstruction = `The athlete asked a specific data question: "${userMessage}". Answer this question using the provided longitudinal data. Focus on trends, averages, and correlations.
    Format your response as a JSON object: { "text": "your answer here" }`;
  }

  const prompt = `
    Act as an AI Assistant Coach for a high-performance athlete.
    Data Context (last ${lookback} days): ${JSON.stringify(contextData)}
    Athlete Personality: ${personalityCalibration}

    TASK: ${specificInstruction}

    BOUNDARIES:
    - DO NOT suggest training changes.
    - DO NOT provide medical advice.
    - Focus strictly on System State and Biological Trends.
    - Keep it concise (2-4 sentences).
    - ALWAYS return valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text || JSON.stringify({ text: "I'm processing your data. Please try again." });
  } catch (error) {
    console.error("Gemini Interaction Error:", error);
    // Fallback to 1.5 flash if 3.0 fails
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return fallbackResponse.text || JSON.stringify({ text: "I'm having trouble accessing your longitudinal data right now." });
    } catch (innerError) {
      return JSON.stringify({ text: "I'm having trouble accessing your longitudinal data right now." });
    }
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
