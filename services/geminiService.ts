
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
 * Analyzes individual athlete wellness data using pattern recognition.
 * Acts as a subtle, knowledgeable mirror rather than an alarmist auditor.
 */
export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE') => {
  if (entries.length === 0) return "Awaiting daily data to provide your performance context.";
  
  const ai = getAIInstance();
  if (!ai) return "Performance Partner offline.";
  
  // Provide enough history (up to 30 days) for pattern recognition
  const contextData = entries.slice(0, 30);
  
  const prompt = `
    Act as an Individualized Pattern Recognition Engine and Performance Partner. 
    Review the last 30 entries of wellness data (newest first): ${JSON.stringify(contextData)}. 
    
    YOUR CORE PHILOSOPHY:
    - You are a "mirror" (subtle and knowledgeable), not a "judge" (alarmist).
    - Avoid gamification, medals, or streaks. Focus on "Clarity-as-a-Service."
    - Use supportive, professional, and objective language. Avoid "Danger," "Warning," or "Bad."

    SPECIFIC PATTERN RECOGNITION TASKS:
    1. THE MENSTRUAL CYCLE "GHOST": Look for a consistent dip in metrics (Energy, Soreness, Sleep) roughly 4 days BEFORE the "menstrualCycle" toggle is set to TRUE in previous months. If you see this pattern emerging now, provide "permission to be tired" rather than flagging it as a training issue.
    2. THE "PRE-ILLNESS" SIGNATURE: Analyze entries preceding any "feelingSick: true" flags. Does this person show a specific drop in Sleep Quality or a spike in Stress first? If their current data matches their unique "pre-illness signature," suggest a subtle pivot to restoration (e.g., extra sleep) without causing alarm.
    3. THE "WHY": Educate the user on how their biological data is responding to their life and training context.

    OUTPUT FORMAT:
    - Provide 2-3 short, meaningful sentences. 
    - No bullet points unless absolutely necessary for clarity.
    - Focus on "Actionable Empowerment."
    
    Target Audience: ${role === 'COACH' ? 'Brief, objective briefing for staff.' : 'Direct, empowering, and subtle insight for the individual.'}.
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
    Review the squad wellness data: ${JSON.stringify(allEntries.slice(0, 20))}. 
    Identify collective patterns of adaptation. 
    Highlight individuals whose data suggests a shift into a "Restoration Focus" phase based on their historical signatures. 
    Keep the tone objective, technical, and performance-oriented.
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
