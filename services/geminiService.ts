
import { GoogleGenAI } from "@google/genai";
import { WellnessEntry, User, UserRole } from "../types";

/**
 * Analyzes individual athlete wellness data.
 */
export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE') => {
  if (entries.length === 0) return "Awaiting daily data for analysis.";
  
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') return "AI analysis offline (Missing API Key).";
  
  const ai = new GoogleGenAI({ apiKey });
  const latest = entries[0];
  
  const prompt = `Act as an elite sports scientist. Analyze this athlete's data: ${JSON.stringify(latest)}. 
  Provide 2 succinct bullet points of advice specifically for the ${role === 'COACH' ? 'coach' : 'athlete'}.`;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-2.5-flash-lite-latest", 
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
  
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') return "Squad AI briefing unavailable (Missing API Key).";
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Analyze this squad's wellness data. Identify who needs rest or immediate intervention based on fatigue metrics. Data: ${JSON.stringify(allEntries.slice(0, 10))}`;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-2.5-flash-lite-latest", 
      contents: prompt 
    });
    return response.text || "Check outlier reports manually.";
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return "Check outlier reports manually.";
  }
};
