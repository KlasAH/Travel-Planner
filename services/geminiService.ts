import { GoogleGenAI, Type } from "@google/genai";

// Safely access process.env to avoid ReferenceError in purely browser environments
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore error
  }
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export interface Suggestion {
  day: number;
  activities: {
    title: string;
    description: string;
    location: string;
    estimatedCost: number;
    timeOfDay: string;
  }[];
}

export const generateItinerary = async (destination: string, days: number, interests: string): Promise<Suggestion[]> => {
  if (!apiKey) {
    console.warn("No API Key provided. Mocking response.");
    return [];
  }

  const prompt = `Create a ${days}-day travel itinerary for ${destination}. 
  Interests: ${interests || 'General sightseeing, food, and culture'}.
  
  Return a strictly valid JSON array where each item represents a day.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    location: { type: Type.STRING },
                    estimatedCost: { type: Type.NUMBER },
                    timeOfDay: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Suggestion[];
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw error;
  }
};