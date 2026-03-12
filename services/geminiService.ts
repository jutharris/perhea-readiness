
import { GoogleGenAI } from "@google/genai";
import { WellnessEntry, User, IntelligencePacket } from "../types";

import { storageService } from "./storageService";

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
export const getAthleteAnalysis = async (entries: WellnessEntry[], user: User, customInstruction?: string) => {
  if (entries.length === 0) return "Your insights get sharper every week. Keep reporting!";
  
  const ai = getAIInstance();
  if (!ai) return "Performance Partner offline.";

  const soulDoc = await storageService.getGlobalSoulDocument();
  
  const role = user.role;
  const intelligencePacket = user.intelligencePacket;

  const personalityDirectives = {
    STOIC: "This athlete is STOIC. They under-report pain and fatigue. If they report any dip at all, prioritize it as a significant physiological event. Be highly sensitive to small changes.",
    BALANCED: "This athlete is BALANCED. Their reporting is generally reliable and proportional to their state.",
    EXPRESSIVE: "This athlete is EXPRESSIVE. They report based on current mood and 'vibes', which can be volatile. Filter for the signal within the noise; do not overreact to single-day swings."
  }[user.personalityCalibration] || "";

  const systemInstruction = customInstruction || `${soulDoc}
  ${personalityDirectives}
  Do not be overly reactive to single-day dips unless the personality calibration suggests otherwise. 
  Focus on long-term trends and provide physiological context without being overly technical or prescriptive.
  Keep your response concise (2-3 sentences).
  Avoid definitive medical judgments.`;

  // Summary Lookback: Keep it lean for speed (Max 14 days for the fast summary)
  const entryCount = entries.length;
  const lookback = entryCount > 14 ? 14 : entryCount;
  let calibrationNote = "";
  
  if (entryCount <= 7) {
    calibrationNote = "System is in Initial Calibration Mode (Days 1-7). Focus on building baseline and establishing reporting consistency.";
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

  const lawsContext = intelligencePacket?.laws.map(l => 
    `${l.horizon}-Day Law (${l.status}): ${l.laws.join('; ')}`
  ).join('\n') || "No Biological Laws established yet.";
  
  const prompt = `
    Act as a Performance Scientist specializing in Multivariate Turbulence Models.
    Review the last ${lookback} entries of athlete data: ${JSON.stringify(contextData)}.
    
    BIOLOGICAL LAWS (Historical Context):
    ${lawsContext}

    CURRENT CALIBRATION PHASE: ${calibrationNote || "Full Baseline Established."}

    CORE OBJECTIVE: 
    Identify "Biological Turbulence"—when the historical relationship (correlation) between metrics breaks. 
    Focus on "Decoupling" rather than just low scores.
    
    METRIC LOGIC:
    - All wellness metrics (Energy, Freshness, Sleep, Stress Mgmt, Mood) are READINESS SCORES on a 1-7 scale.
    - HIGHER is ALWAYS BETTER (e.g., 7/7 Stress Mgmt = Perfectly Calm; 7/7 Freshness = No Soreness).
    - RPE is the only inverted metric (Higher = Higher Load).
    - Wearable Score (1-10) may be null if data is unavailable. If null, ignore it and focus on subjective metrics.

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
       - Use the "Budget Framework": If an athlete is deep in the red, suggest finding a "Recovery Budget" over the next 72 hours rather than telling them to skip training.

    OUTPUT STYLE:
    - 2 to 3 sentences of high-density, highly specific insight.
    - CRITICAL: You MUST explicitly mention at least one specific metric, trend, or correlation you observed in the data (e.g., "Your sleep dropped to 4/7 over the last two days, but your energy is holding steady"). Do not give generic "everything is stable" summaries.
    - Avoid technical jargon.
    - Use the role context: ${role}.
    ${calibrationNote ? `- Acknowledge that you are still calibrating but provide the best insight possible.` : ""}
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview", 
      contents: prompt,
      config: { 
        systemInstruction
      }
    });
    return response.text || "Metrics are within your adaptive range.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback to gemini-3-flash-preview without thinking config if it failed
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { systemInstruction }
      });
      return fallbackResponse.text || "Maintaining stable protocol based on current metrics.";
    } catch {
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
  personalityCalibration: string = 'BALANCED',
  role: string = 'ATHLETE',
  athleteName: string = 'The athlete'
) => {
  const ai = getAIInstance();
  if (!ai) return "Interaction offline.";

  const entryCount = entries.length;
  // Deep Lookback: Use full context for "Genius" interactions (Max 50 days)
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
    specificInstruction = `Additional context provided: "${userMessage}". Acknowledge this context and explain how it might explain the current biological turbulence or why the system should adjust its sensitivity.
    Format your response as a JSON object: { "text": "your response here" }`;
  } else if (type === 'DATA_QUERY') {
    specificInstruction = `A specific data question was asked: "${userMessage}". Answer this question using the provided longitudinal data. Focus on trends, averages, and correlations.
    Format your response as a JSON object: { "text": "your answer here" }`;
  }

  const personaInstruction = role === 'COACH'
    ? `Act as an elite AI Performance Director briefing a Head Coach about ${athleteName}. Speak clinically, objectively, and in the third person (refer to them as "${athleteName}" or "the athlete", NEVER "you").`
    : `Act as an AI Assistant Coach talking directly to the athlete. Speak in the first person to them (use "you" and "your").`;

  const prompt = `
    ${personaInstruction}
    Data Context (last ${lookback} days): ${JSON.stringify(contextData)}
    Athlete Personality: ${personalityCalibration}

    TASK: ${specificInstruction}

    BOUNDARIES:
    - All wellness metrics are READINESS SCORES (1-7). Higher is better.
    - Stress Management: 7/7 is calm/optimal.
    - Muscle Freshness: 7/7 is fresh/no soreness.
    - Wearable Score: 1-10 scale, but may be null. If null, acknowledge data is missing.
    - DO NOT suggest training changes.
    - DO NOT provide medical advice.
    - Focus strictly on System State and Biological Trends.
    - Keep it concise (2-4 sentences).
    - ALWAYS return valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview", 
      contents: prompt,
      config: { 
        responseMimeType: "application/json"
      }
    });
    return response.text || JSON.stringify({ text: "I'm processing your data. Please try again." });
  } catch (error) {
    console.error("Gemini Interaction Error:", error);
    // Fallback to gemini-3-flash-preview without thinking config
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return fallbackResponse.text || JSON.stringify({ text: "I'm having trouble accessing your longitudinal data right now." });
    } catch {
      return JSON.stringify({ text: "I'm having trouble accessing your longitudinal data right now." });
    }
  }
};

/**
 * Performs a "Deep Audit" of an athlete's raw data to establish tiered Biological Laws.
 * This is the "Heavy Lift" that runs in the background.
 */
export const getDeepAudit = async (entries: WellnessEntry[]): Promise<IntelligencePacket> => {
  const ai = getAIInstance();
  if (!ai) throw new Error("AI Instance unavailable for Deep Audit.");

  const contextData = entries.slice(0, 50).map(e => ({
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
    Act as a High-Performance Scientist and Biological Historian.
    Analyze the last 50 days of raw athlete data: ${JSON.stringify(contextData)}.
    
    TASK:
    Establish "Biological Laws" for four nested horizons: 7, 14, 28, and 50 days.
    
    DEFINITIONS:
    - 7-Day (The Vibe): Acute trends, immediate responses to life stress or illness.
    - 14-Day (The Adaptation): How the athlete is absorbing the current training block.
    - 28-Day (The Signature): Hormonal cycles, chronic load capacity, and deep patterns.
    - 50-Day (The Identity): The "Holy Grail" of who this athlete is at their core.

    FOR EACH HORIZON, IDENTIFY:
    1. The primary "Law" (a distilled biological truth about this athlete).
    2. The status (STABLE, TURBULENT, or EVOLVING).

    PHILOSOPHY:
    - Search for "Decoupling" (e.g., "Law: Energy is highly sensitive to sleep quality, dropping 2 points for every 1 hour lost").
    - Identify "Leading Indicators" (e.g., "Law: Stress Mgmt drops 48 hours before physical energy failure").

    Format your response as a JSON object:
    {
      "laws": [
        { "horizon": 7, "laws": ["law 1", "law 2"], "status": "STABLE" },
        ...
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      laws: result.laws.map((l: any) => ({
        ...l,
        lastUpdated: new Date().toISOString()
      })),
      lastDeepAudit: new Date().toISOString()
    };
  } catch (error) {
    console.error("Deep Audit Error:", error);
    // Fallback to flash if pro fails
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(fallbackResponse.text || "{}");
      return {
        laws: result.laws.map((l: any) => ({
          ...l,
          lastUpdated: new Date().toISOString()
        })),
        lastDeepAudit: new Date().toISOString()
      };
    } catch {
      throw error;
    }
  }
};

/**
 * Analyzes squad data for coaching staff using Regime Shift detection.
 */
export const getCoachDailyBriefing = async (athletes: User[], allEntries: WellnessEntry[]) => {
  if (athletes.length === 0) return JSON.stringify({ squadSummary: "No athletes in squad.", athleteHeadlines: {} });
  
  const ai = getAIInstance();
  if (!ai) return JSON.stringify({ squadSummary: "Performance Partner offline.", athleteHeadlines: {} });
  
  const prompt = `
    Act as a Head of Performance. Review the squad's 50-day data window.
    Identify individuals experiencing "Regime Shifts" (High Turbulence) or needing attention.
    
    Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
    {
      "squadSummary": "A 1-sentence high-level summary of the squad's overall status.",
      "athleteHeadlines": {
        "athlete_id_here": "5-word action-oriented headline (e.g., 'High Psychological Load: Deload Required')",
        // include only athletes that need attention or have notable shifts
      }
    }
    
    Data: ${JSON.stringify(allEntries.slice(0, 50))}
    Athletes: ${JSON.stringify(athletes.map(a => ({ id: a.id, name: a.firstName + ' ' + a.lastName })))}
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview", 
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return response.text || JSON.stringify({ squadSummary: "Squad adaptation is stable across all primary vectors.", athleteHeadlines: {} });
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    // Fallback to flash
    try {
      const fallbackResponse = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      return fallbackResponse.text || JSON.stringify({ squadSummary: "Squad adaptation is stable across all primary vectors.", athleteHeadlines: {} });
    } catch {
      return JSON.stringify({ squadSummary: "Manual review of individual turbulence flags recommended.", athleteHeadlines: {} });
    }
  }
};
