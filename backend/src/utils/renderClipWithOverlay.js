const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const settings = require("../../config/settings.json");

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Exec error:", stderr);
        reject(err);
      } else resolve(stdout);
    });
  });
}

function buildOverlayFilters(overlays = []) {
  const drawCommands = [];

  const fontPath = "font/arial.ttf"; // fallback for macOS
  const fontSize = settings.fontSize || 48; // default size if undefined

  overlays.forEach((overlay, index) => {
    const { platform, text, x, y } = overlay;

    const logoPath = {
      instagram: "assets/ig.png",
      tiktok: "assets/tiktok.png",
      twitch: "assets/twitch.png",
    }[platform];

    if (logoPath) {
      drawCommands.push(
        `[0:v][${index + 1}:v] overlay=${x}:${y}:enable='between(t,0,20)'`
      );
    }

    drawCommands.push(
      `drawtext=fontfile='${fontPath}':text='${text}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=black@0.5:boxborderw=5:x=${x}+30:y=${y}`
    );
  });

  return drawCommands.join(",");
}


async function renderClipWithOverlay(inputPath, overlays = []) {
  const timestamp = Date.now();
  const outputPath = path.resolve(`/tmp/output-${timestamp}.mp4`);

  const logoInputs = overlays
    .map((o) => {
      if (!o.platform) return "";
      const imagePath = {
        instagram: "assets/ig.png",
        tiktok: "assets/tiktok.png",
        twitch: "assets/twitch.png",
      }[o.platform];
      return imagePath ? `-i "${imagePath}"` : "";
    })
    .filter(Boolean)
    .join(" ");

  const overlayFilter = buildOverlayFilters(overlays);
  const filterOption = overlayFilter
    ? `-filter_complex "${overlayFilter}"`
    : "";

  const ffmpegCmd = `ffmpeg -y -i "${inputPath}" ${logoInputs} -t ${settings.clipDuration} ${filterOption} -c:v libx264 -c:a aac -shortest "${outputPath}"`;

  await execPromise(ffmpegCmd);

  return outputPath;
}

module.exports = { renderClipWithOverlay };
