import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Retry helper for robust API calls
async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`API call failed, retrying in ${delay}ms...`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 2);
  }
}

export const generateExplanation = async (prompt: string, context: string): Promise<string> => {
  try {
    const client = getClient();
    const fullPrompt = `
      Context: Physics 4C Optics Exam. 
      Topic Constraints: ${context}
      User Question: ${prompt}
      
      Provide a clear, step-by-step physics explanation. If math is involved, use LaTeX formatting wrapped in single $ for inline and $$ for block.
      Keep it concise but helpful for a student studying for an exam.
    `;

    const response = await withRetry(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    }));
    
    return response.text || "I couldn't generate an explanation at this moment.";
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "Connection error. Please try again in a moment.";
  }
};

export const generateDiagram = async (description: string): Promise<string | null> => {
  try {
    const client = getClient();
    const response = await withRetry(() => client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Draw a clean, high-contrast scientific diagram for a physics exam regarding: ${description}. White background, clear lines, minimalistic.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return null;
  }
};

export const generatePracticeProblem = async (topic: string): Promise<string> => {
   try {
    const client = getClient();
    const prompt = `
      Create a unique practice problem for Physics 4C Exam 3.
      Topic: ${topic}.
      Difficulty: University Physics level.
      Format:
      **Problem:** [The problem text]
      **Solution:** [Hidden initially, but provide the step-by-step solution here]
    `;

    const response = await withRetry(() => client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }));
    
    return response.text || "Could not generate a problem.";
  } catch (error) {
    console.error("Gemini Problem Error:", error);
    return "Error generating problem. Please check your connection.";
  }
};