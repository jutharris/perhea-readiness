
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
 * Analyzes individual athlete wellness data.
 * Updated to be a "Performance Partner" - supportive, non-alarmist, and objective.
 */
export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE') => {
  if (entries.length === 0) return "Awaiting daily data to provide your performance context.";
  
  const ai = getAIInstance();
  if (!ai) return "Performance Partner offline.";
  
  const latest = entries[0];
  const prompt = `
    Act as an Elite Performance Partner and Sports Scientist. 
    Analyze this athlete's wellness report: ${JSON.stringify(latest)}. 
    
    CRITICAL INSTRUCTION: 
    - Use supportive, empowering, and professional language. 
    - Avoid alarmist words like "Danger", "Warning", "Bad", or "Overtrained". 
    - Use phrases like "Opportunity for restoration", "Normal adaptive response", or "Prime state for focus".
    - Provide 2 succinct bullet points of advice.
    - Focus on the "Why" (Education) and "What Next" (Action).
    
    Target Audience: ${role === 'COACH' ? 'The coaching staff (brief and objective)' : 'The athlete (empowering and educational)'}.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt 
    });
    return response.text || "Continue focusing on your professional recovery protocols.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Maintain consistency with your established performance routines.";
  }
};

/**
 * Analyzes squad data for coaching staff.
 */
export const getCoachDailyBriefing = async (athletes: User[], allEntries: WellnessEntry[]) => {
  if (athletes.length === 0) return "No athletes in squad.";
  
  const ai = getAIInstance();
  if (!ai) return "Squad briefing unavailable.";
  
  const prompt = `
    Act as a Head of Performance. 
    Review the squad wellness data: ${JSON.stringify(allEntries.slice(0, 15))}. 
    Identify patterns of adaptation across the group. 
    Highlight individuals who might benefit from a conversation about their "Restoration Focus" today. 
    Keep the tone objective and performance-oriented.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-pro-preview", 
      contents: prompt 
    });
    return response.text || "Squad metrics are within expected ranges. Monitor individual feedback.";
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return "Check outlier reports manually in the squad view.";
  }
};
