import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, VoiceQuestion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const questionGenerationModel = 'gemini-2.5-flash';
const mentorModel = 'gemini-2.5-flash';

export const generateAptitudeQuestions = async (topic: string, count: number): Promise<Question[]> => {
  if (!API_KEY) return Promise.resolve([]);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: questionGenerationModel,
      contents: `Generate ${count} multiple-choice aptitude questions about "${topic}". For each question, provide a question text, 4 options, the correct answer, and a brief explanation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const jsonString = response.text.trim();
    const questions = JSON.parse(jsonString);
    return questions;
  } catch (error) {
    console.error("Error generating questions with Gemini:", error);
    return [];
  }
};


export const getAIMentorResponse = async (prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], performanceData?: string) => {
    if (!API_KEY) return "Gemini API key is not configured. I can't help right now.";
    
    let systemInstruction = "You are AptiPro's AI Mentor. You are an expert in aptitude tests, including quantitative, logical, and verbal reasoning. Your tone is encouraging, helpful, and clear. Help users understand concepts and solve problems step-by-step. Do not answer questions outside of this scope.";

    if (performanceData) {
        systemInstruction += `\n\nAdditionally, use the user's past performance data to provide personalized advice and suggestions. Here is a summary of their performance:\n${performanceData}`;
    }

    const chat = ai.chats.create({
        model: mentorModel,
        config: {
            systemInstruction,
        },
        history,
    });
    
    try {
        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        console.error("Error getting AI mentor response:", error);
        return "Sorry, I encountered an error. Please try again.";
    }
};

export const generateVoiceTestQuestions = async (topic: string, difficulty: string, count: number): Promise<VoiceQuestion[]> => {
  if (!API_KEY) return Promise.resolve([]);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: questionGenerationModel,
      contents: `Generate ${count} aptitude questions for a voice test on the topic "${topic}" with ${difficulty} difficulty. The questions should be clear and concise. The answers should be simple, one-or-two-word answers that are easy to say.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ["question", "answer"]
          }
        }
      }
    });
    const jsonString = response.text.trim();
    const questions = JSON.parse(jsonString);
    return questions;
  } catch (error) {
    console.error("Error generating voice test questions:", error);
    return [];
  }
};

export const evaluateSpokenAnswer = async (question: string, correctAnswer: string, spokenAnswer: string): Promise<{ isCorrect: boolean; feedback: string }> => {
  if (!API_KEY) return Promise.resolve({ isCorrect: false, feedback: "AI evaluation is unavailable." });

  try {
    const prompt = `Question: "${question}"
    Correct Answer: "${correctAnswer}"
    User's Spoken Answer: "${spokenAnswer}"
    
    Is the user's spoken answer correct? Be flexible with minor variations (e.g., 'forty five' vs '45', extra words like 'the answer is...'). Respond in JSON format with two keys: "isCorrect" (boolean) and "feedback" (a brief string explaining why, or just confirming correctness).`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: questionGenerationModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isCorrect: { type: Type.BOOLEAN },
                    feedback: { type: Type.STRING }
                },
                required: ["isCorrect", "feedback"]
            }
        }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result;

  } catch (error) {
    console.error("Error evaluating answer:", error);
    // Fallback for simple check if AI fails
    if (spokenAnswer.toLowerCase().includes(correctAnswer.toLowerCase())) {
        return { isCorrect: true, feedback: 'Correct!' };
    }
    return { isCorrect: false, feedback: `Sorry, an error occurred during evaluation. The expected answer is similar to "${correctAnswer}".` };
  }
};