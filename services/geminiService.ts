
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

const getApiKey = () => {
  // @ts-ignore - process is injected by Vite in some configs, or meta.env
  const key = (typeof process !== 'undefined' ? process.env.API_KEY || process.env.GEMINI_API_KEY : '') || import.meta.env?.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("API_KEY is missing from environment");
  return key;
}

export const generateExplanation = async (prompt: string, context: string): Promise<string> => {
  try {
    const fullPrompt = `
      Context: Optics Exam. 
      Topic Constraints: ${context}
      User Question: ${prompt}
      
      Provide a clear, step-by-step physics explanation. If math is involved, use LaTeX formatting wrapped in single $ for inline and $$ for block.
      Keep it concise but helpful for a student studying for an exam.
    `;

    const response = await withRetry(async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });
      if (!res.ok) throw new Error("API Fetch Error");
      return res.json();
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate an explanation at this moment.";
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "Connection error. Please try again in a moment.";
  }
};

export const generateDiagram = async (description: string): Promise<string | null> => {
  try {
    const response = await withRetry(async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Draw a clean, high-contrast scientific diagram for a physics exam regarding: ${description}. White background, clear lines, minimalistic.` }] }]
          // Note: Image config logic natively requires different payload mapping in raw API. Keeping standard content generation for fallback matching.
        })
      });
      if (!res.ok) throw new Error("API Fetch Error");
      return res.json();
    });

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
    const prompt = `
      Create a unique practice problem for Optics Exam.
      Topic: ${topic}.
      Difficulty: University Physics level.
      Format:
      **Problem:** [The problem text]
      **Solution:** [Hidden initially, but provide the step-by-step solution here]
    `;

    const response = await withRetry(async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${getApiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (!res.ok) throw new Error("API Fetch Error");
      return res.json();
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate a problem.";
  } catch (error) {
    console.error("Gemini Problem Error:", error);
    return "Error generating problem. Please check your connection.";
  }
};