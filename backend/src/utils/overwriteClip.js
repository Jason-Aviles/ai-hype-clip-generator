const fs = require("fs");
const path = require("path");
const Clip = require("../models/Clip");
const { uploadFileToS3 } = require("../utils/s3Service");

async function overwriteClip(req, res) {
  try {
    const { clipId } = req.params;
    const previewPath = path.resolve(
      __dirname,
      `../../clips/preview-${clipId}.mp4`
    );
    const originalName = `spike-${clipId}.mp4`;

    if (!fs.existsSync(previewPath)) {
      return res.status(404).json({ error: "Preview clip not found" });
    }

    const s3Path = await uploadFileToS3(previewPath, originalName);
    await Clip.findByIdAndUpdate(clipId, { filePath: s3Path });

    fs.unlinkSync(previewPath);
    return res.json({ success: true, filePath: s3Path });
  } catch (err) {
    console.error("❌ Overwrite error:", err);
    return res.status(500).json({ error: "Failed to overwrite clip" });
  }
}

module.exports = overwriteClip;
