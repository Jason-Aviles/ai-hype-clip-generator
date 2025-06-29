const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

async function transcribeAudio(filePath) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY environment variable.");
    return null;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at path: ${filePath}`);
    return null;
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("model", "whisper-1");

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        maxBodyLength: Infinity, // For longer audio
      }
    );

    return response.data.text;
  } catch (err) {
    console.error(
      "❌ Whisper transcription error:",
      err.response?.data || err.message
    );
    return null;
  }
}

module.exports = { transcribeAudio };
