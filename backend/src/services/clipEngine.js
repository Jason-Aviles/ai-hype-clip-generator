const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const Clip = require("../models/Clip");
const settings = require("../../config/settings.json");
const { transcribeAudio } = require("./whisperService");
const { analyzeEmotion } = require("./emotionService");

let isRecording = false;

function isClipViral({ transcript, emotion }) {
  if (!transcript) return false;

  const keywords = ["OMG", "NO WAY", "WTF", "CRAZY", "INSANE", "CLUTCH"];
  const hasKeyword = keywords.some((kw) =>
    transcript.toUpperCase().includes(kw)
  );

  const emotionScore = ["excited", "angry", "happy"].includes(emotion);

  return hasKeyword || emotionScore;
}

async function triggerClipSpike(tags, message) {
  if (isRecording) return;
  isRecording = true;

  const timestamp = Date.now();
  const username = tags["display-name"] || "unknown";
  const filePath = path.join(__dirname, `../../clips/spike-${timestamp}.mp4`);

  // 🎙 Video & audio input index: 1:1 = screen + mic #1
  const ffmpegCmd = `ffmpeg -y -f avfoundation -framerate 30 -i "1:1" -t ${settings.clipDuration} -ac 1 -ar 44100 -af "afftdn=nf=-25, highpass=f=90, lowpass=f=12000, dynaudnorm=f=200:g=15" "${filePath}"`;

  console.log("🎥 Starting screen recording...");

  exec(ffmpegCmd, async (error) => {
    let transcript = "";
    let emotion = "";
    let viral = false;

    if (!error) {
      console.log("📼 Clip recorded:", filePath);

      try {
        transcript = await transcribeAudio(filePath);
        console.log("🗣 Transcript:", transcript || "(empty)");

        if (transcript) {
          emotion = await analyzeEmotion(transcript);
          console.log("😮 Emotion Detected:", emotion);
        } else {
          console.warn(
            "⚠️ Skipping emotion detection due to empty transcript."
          );
        }

        viral = isClipViral({ transcript, emotion });
        console.log("🔥 Viral:", viral);
      } catch (err) {
        console.error("❌ Transcription/Emotion error:", err.message);
      }

      await Clip.create({
        username,
        message,
        transcript,
        emotion,
        filePath,
        viral,
        type: "chat_spike",
        createdAt: new Date(),
      });

      console.log("🧠 Clip saved to MongoDB");
    } else {
      console.error("❌ ffmpeg error:", error.message);
    }

    isRecording = false;
  });
}

module.exports = { triggerClipSpike };
