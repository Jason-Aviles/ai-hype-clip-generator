const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const Clip = require("../models/Clip");
const settings = require("../config/settings.json");

// access via: settings.clipDuration, settings.spikeThreshold, settings.triggerWords

let isRecording = false;

async function triggerClipSpike(tags, message) {
  if (isRecording) return;
  isRecording = true;

  const timestamp = Date.now();
  const username = tags["display-name"] || "unknown";
  const filePath = path.join(__dirname, `../../clips/spike-${timestamp}.mp4`);
  const ffmpegCmd = `ffmpeg -y -f avfoundation -framerate 30 -pixel_format uyvy422 -i "1:1" -t ${settings.clipDuration} "${filePath}"`;

  console.log("🎥 Starting screen recording...");

  exec(ffmpegCmd, async (error) => {
    if (!error) {
      console.log("📼 Clip recorded:", filePath);

      await Clip.create({
        username,
        message,
        filePath,
        type: "chat_spike",
        createdAt: new Date(),
      });
      console.log("🧠 Clip saved to MongoDB");
    } else {
      console.error("❌ ffmpeg error:", error.message);
    }

    isRecording = false; // reset lock
  });
}
module.exports = { triggerClipSpike };
