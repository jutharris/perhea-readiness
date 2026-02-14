import { GoogleGenAI } from "@google/genai";
import { WellnessEntry, User, UserRole } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes individual athlete wellness data.
 */
export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE') => {
  if (entries.length === 0) return "Awaiting daily data for analysis.";
  
  const ai = getAIInstance();
  if (!ai) return "AI analysis offline (Missing API Key).";
  
  const latest = entries[0];
  const prompt = `Act as an elite sports scientist. Analyze this athlete's wellness report: ${JSON.stringify(latest)}. 
  Provide 2 succinct, high-impact bullet points of advice specifically for the ${role === 'COACH' ? 'coach' : 'athlete'}. 
  Focus on readiness and immediate physical requirements.`;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt 
    });
    return response.text || "Prioritize recovery and professional protocol.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Prioritize recovery and professional protocol.";
  }
};

/**
 * Analyzes squad data for coaching staff.
 */
export const getCoachDailyBriefing = async (athletes: User[], allEntries: WellnessEntry[]) => {
  if (athletes.length === 0) return "No athletes in squad.";
  
  const ai = getAIInstance();
  if (!ai) return "Squad AI briefing unavailable (Missing API Key).";
  
  const prompt = `Act as a Head of Performance. Analyze the following squad wellness data and identify any critical outliers or athletes requiring immediate intervention/rest. 
  Data Summary: ${JSON.stringify(allEntries.slice(0, 15))}. 
  Provide a high-level summary of squad readiness.`;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt 
    });
    return response.text || "Check outlier reports manually.";
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return "Check outlier reports manually.";
  }
};
