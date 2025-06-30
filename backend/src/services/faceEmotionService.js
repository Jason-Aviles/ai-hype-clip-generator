const { exec } = require("child_process");
const path = require("path");

function analyzeFaceEmotion(
  videoPath,
  { live = false, backend = "mediapipe" }
) {
  const script = live
    ? path.join(__dirname, "faceEmotionWebcam.py")
    : path.join(__dirname, "faceEmotionVideo.py");

  const args = live ? backend : `"${videoPath}" ${backend}`;
  const cmd = `python3 "${script}" ${args}`;

  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("Face Emotion Error:", stderr);
        return resolve("unknown");
      }
      resolve(stdout.trim());
    });
  });
}

module.exports = { analyzeFaceEmotion };
