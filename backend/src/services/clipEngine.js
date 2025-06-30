const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const Clip = require("../models/Clip");
const settings = require("../../config/settings.json");
const { transcribeAudio } = require("./whisperService");
const { analyzeEmotion } = require("./emotionService");
const { analyzeFaceEmotion } = require("./faceEmotionService");
const { getIO } = require("../socket");
const { uploadFileToS3 } = require("./s3Service");

let isRecording = false;

function isClipViral({ transcript, emotion, faceEmotion }) {
  if (!transcript) return false;

  const keywords = ["OMG", "NO WAY", "WTF", "CRAZY", "INSANE", "CLUTCH"];
  const hasKeyword = keywords.some((kw) =>
    transcript.toUpperCase().includes(kw)
  );

  const voiceEmotionScore = ["excited", "angry", "happy"].includes(emotion);
  const faceEmotionScore = ["surprise", "happy", "fear"].includes(faceEmotion);

  const scoreDetails = {
    transcriptMatched: hasKeyword,
    voiceEmotionMatched: voiceEmotionScore,
    faceEmotionMatched: faceEmotionScore,
  };

  console.log("📊 Trigger breakdown:", scoreDetails);

  const scoreCount = Object.values(scoreDetails).filter(Boolean).length;
  return scoreCount === 3 || scoreCount >= 2;
}

function sendProgress(status, percent) {
  try {
    const io = getIO();
    io.emit("clipProgress", { status, percent });
  } catch (e) {
    console.warn("⚠️ Socket.io not initialized, skipping progress update");
  }
}

async function triggerClipSpike(tags, message) {
  if (isRecording) return;
  isRecording = true;

  const timestamp = Date.now();
  const username = tags["display-name"] || "unknown";

  const audioPath = path.join(__dirname, `../../clips/audio-${timestamp}.wav`);
  const videoPath = path.join(__dirname, `../../clips/video-${timestamp}.mp4`);
  const finalClipPath = path.join(
    __dirname,
    `../../clips/spike-${timestamp}.mp4`
  );

  const soxCmd = `sox -t coreaudio default "${audioPath}" trim 0 ${settings.clipDuration}`;
  const ffmpegVideoCmd = `ffmpeg -y -f avfoundation -framerate 30 -video_size 1280x720 -i "1:none" -t ${settings.clipDuration} "${videoPath}"`;
  const mergeCmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${finalClipPath}"`;

  try {
    sendProgress("🎙 Recording clean audio with SoX...", 10);
    await execPromise(soxCmd);

    sendProgress("🎥 Recording video with FFmpeg...", 30);
    await execPromise(ffmpegVideoCmd);

    sendProgress("🔗 Merging audio + video...", 60);
    await execPromise(mergeCmd);

    sendProgress("🧠 Capturing face emotion via webcam...", 70);
    let faceEmotion = "unknown";
    try {
      faceEmotion = await analyzeFaceEmotion(null, {
        live: true,
        backend: "mediapipe",
      });
    } catch (e) {
      console.warn("⚠️ Face emotion analysis failed:", e.message);
    }

    sendProgress("🗣 Transcribing audio...", 80);
    const transcript = await transcribeAudio(audioPath);
    console.log("🗣 Transcript:", transcript || "(empty)");

    let emotion = "";
    if (transcript) {
      sendProgress("😮 Analyzing voice emotion...", 90);
      emotion = await analyzeEmotion(transcript);
    }

    const viral = isClipViral({ transcript, emotion, faceEmotion });

    sendProgress("☁️ Uploading clip to S3...", 95);
    const s3FilePath = await uploadFileToS3(
      finalClipPath,
      `spike-${timestamp}.mp4`
    );

    await Clip.create({
      username,
      message,
      transcript,
      emotion,
      faceEmotion,
      filePath: s3FilePath,
      viral,
      type: "chat_spike",
      createdAt: new Date(),
    });

    console.log("🧠 Clip saved to MongoDB");

    fs.unlink(audioPath, () => {});
    fs.unlink(videoPath, () => {});
    fs.unlink(finalClipPath, () => {});

    sendProgress("✅ Done!", 100);
  } catch (err) {
    console.error("❌ Error during clip creation:", err.message);
    sendProgress("❌ Error during clip creation", 0);
  }

  isRecording = false;
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

module.exports = { triggerClipSpike };
