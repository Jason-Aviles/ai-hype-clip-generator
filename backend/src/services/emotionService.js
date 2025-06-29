const OpenAI = require("openai");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze emotional tone from a transcript.
 * @param {string} transcript - The user's spoken or written input.
 * @returns {Promise<string>} - The detected emotion.
 */
async function analyzeEmotion(transcript) {
  if (!transcript || typeof transcript !== "string") {
    throw new Error("Invalid transcript input.");
  }

  const prompt = `
You are a hype emotion detector. 
Read the following transcript and tell me the dominant tone: hype, rage, chill, sad, excited, funny, or confused. 
Respond ONLY with the emotion.

Transcript: "${transcript}"
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const response = res.choices?.[0]?.message?.content?.trim().toLowerCase();

    if (!response) {
      throw new Error("No emotion returned from OpenAI.");
    }

    return response;
  } catch (error) {
    console.error("Error in analyzeEmotion:", error);
    throw new Error("Failed to analyze emotion.");
  }
}

module.exports = { analyzeEmotion };
