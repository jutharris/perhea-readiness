
import { GoogleGenAI } from "@google/genai";
import { WellnessEntry, User, UserRole } from "../types";
import { storageService } from "./storageService";

export const getAthleteAnalysis = async (entries: WellnessEntry[], role: UserRole = 'ATHLETE') => {
  if (entries.length === 0) return "Awaiting daily data.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const users = await storageService.getAllUsers();
  const user = users.find(u => u.id === entries[0].userId);
  
  const prompt = `
    Act as a Performance Logic Auditor.
    Athlete: ${user?.name}
    Latest Entry: ${JSON.stringify(entries[0])}
    
    Goal: Identify gaps between reported wellness and training load.
    Format: Succinct, professional cues.
  `;

  try {
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text;
  } catch (error) {
    return "Prioritize protocol adherence.";
  }
};

export const getCoachDailyBriefing = async (athletes: User[], allEntries: WellnessEntry[], coachId: string) => {
  if (athletes.length === 0) return "No athletes assigned.";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const principles = await storageService.getPrinciples(coachId);

  const prompt = `
    Act as a Squad Performance Auditor.
    Coach Philosophy: ${principles.map(p => p.instruction).join(', ')}
    Squad Data Summary provided. Identify high-risk outliers and suggest interventions.
  `;

  try {
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text;
  } catch (error) {
    return "Briefing unavailable.";
  }
};
