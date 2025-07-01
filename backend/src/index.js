require("dotenv").config();
const express = require("express");
const session = require("cookie-session");
const { triggerClipSpike } = require("./services/clipEngine");
const Spike = require("./models/Spike");
const { spikeLimiter } = require("../middleware/rateLimiter");
const Clip = require("./models/Clip");
const mongoose = require("mongoose");
const fs = require("fs");
const statsRoutes = require("./routes/stats");
const path = require("path");
const settings = require("../config/settings.json"); // <== required
const { exec } = require("child_process");
const { renderClipWithOverlay } = require("./utils/renderClipWithOverlay");
const { downloadFromS3, uploadFileToTempS3 } = require("./utils/s3TempService");


const { createChatMonitor } = require("./services/chatMonitor");
const cors = require("cors");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// 🧠 MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/hypeclip", { useNewUrlParser: true })
  .then(() => console.log("🧠 Connected to MongoDB"))
  .catch(console.error);

// 🔁 Active monitor reference
let activeMonitor = null;

// 🧱 Middleware
app.set("trust proxy", 1);
app.use(
  session({
    name: "session",
    keys: ["secret1", "secret2"],
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
    secure: false,
  })
);
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use("/auth/twitch", require("./auth/twitch"));

// 📦 Routes

app.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const skip = parseInt(req.query.skip) || 0;
  try {
    const clips = await Clip.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(clips);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clips" });
  }
});

app.use("/api", statsRoutes);
app.get("/api/clips", async (req, res) => {
  try {
    const clips = await Clip.find().sort({ createdAt: -1 });
    res.json(clips);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching clips" });
  }
});
app.post("/render-from-s3", async (req, res) => {
  try {
    const { s3Path, overlays } = req.body;

    // Download from main S3 to local /tmp
    const inputPath = `/tmp/input-${Date.now()}.mp4`;
    await downloadFromS3(s3Path, inputPath);

    // Render overlay, returns local output path
    const outputPath = await renderClipWithOverlay(inputPath, overlays);

    // Upload rendered video to TEMP bucket and get public S3 URL
    const uploadedUrl = await uploadFileToTempS3(outputPath); // returns full https://... URL

    // Cleanup local files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // Return result to frontend
    res.json({ success: true, tempOverlayPath: uploadedUrl });
  } catch (err) {
    console.error("❌ Failed render-from-s3:", err);
    res.status(500).json({ error: "Render failed" });
  }
});


app.post("/overwrite-final/:clipId", async (req, res) => {
  try {
    const { tempOverlayPath } = req.body;
    const clipId = req.params.clipId;

    const finalPath = await moveOverlayToFinal(tempOverlayPath);
    await Clip.findByIdAndUpdate(clipId, { filePath: finalPath });

    res.json({ success: true, finalPath });
  } catch (err) {
    console.error("❌ Overwrite Final failed:", err);
    res.status(500).json({ error: "Overwrite failed" });
  }
});



app.post("/api/render-clip/:id", async (req, res) => {
  try {
    const clipId = req.params.id;
    const { overlays } = req.body;

    const clip = await Clip.findById(clipId);
    if (!clip || !clip.filePath) {
      return res.status(404).json({ error: "Clip not found" });
    }

    const s3FilePath = clip.filePath;
    const localInputPath = path.join(
      __dirname,
      `../clips/${path.basename(s3FilePath)}`
    );

    // Download from S3 to local /clips folder
    await downloadFileFromS3(s3FilePath, localInputPath);

    // Apply overlay logic
    const outputPath = await renderClipWithOverlay(localInputPath, overlays);

    return res.json({
      success: true,
      filePath: `/clips/${path.basename(outputPath)}`, // relative preview path for browser
    });
  } catch (err) {
    console.error("Render error:", err);
    return res.status(500).json({ error: "Overlay render failed" });
  }
});
app.get("/api/spikes", async (req, res) => {
  try {
    const spikes = await Spike.find().sort({ createdAt: -1 }).limit(50);
    res.json(spikes);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch spike data" });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const [clips, spikes] = await Promise.all([
      Clip.find().lean(),
      Spike.find().lean(),
    ]);

    const totalClips = clips.length;
    const viralClips = clips.filter((c) => c.viral).length;
    const totalSpikes = spikes.length;

    // 🔁 Spikes per hour
    const spikesPerHour = {};
    for (const s of spikes) {
      const hour = new Date(s.timestamp).getHours();
      spikesPerHour[hour] = (spikesPerHour[hour] || 0) + 1;
    }

    // 📆 Clips per day
    const clipsPerDay = {};
    for (const c of clips) {
      const day = new Date(c.createdAt).toLocaleDateString();
      clipsPerDay[day] = (clipsPerDay[day] || 0) + 1;
    }

    // 😊 Top Emotions
    const topEmotions = {};
    for (const c of clips) {
      const e = c.emotion;
      if (e) topEmotions[e] = (topEmotions[e] || 0) + 1;
    }

    // 📺 Top Channels
    const topChannelsMap = {};
    for (const s of spikes) {
      const ch = s.channel;
      if (ch) topChannelsMap[ch] = (topChannelsMap[ch] || 0) + 1;
    }
    const topChannels = Object.entries(topChannelsMap)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalClips,
      viralClips,
      totalSpikes,
      spikesPerHour,
      clipsPerDay,
      topEmotions,
      topChannels,
    });
  } catch (err) {
    res.status(500).json({ error: "Stats fetch failed" });
  }
});


app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/progress", (req, res) => {
  res.json({ recording: false, progress: 0 }); // placeholder
});

app.get("/api/clip/:id", async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);
    if (!clip) return res.status(404).json({ error: "Clip not found" });
    res.json(clip);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching clip" });
  }
});

app.get("/api/clip/:id/download", async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);
    if (!clip) return res.status(404).json({ error: "Clip not found" });

    const filePath = path.resolve(clip.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(filePath, `clip-${clip._id}.mp4`);
  } catch (err) {
    res.status(500).json({ error: "Server error while downloading" });
  }
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/twitch/login");
  res.redirect("http://localhost:3000/redirect");
});

app.get("/check-session", (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.get("/auth/logout", (req, res) => {
  req.session = null;
  res.redirect("http://localhost:3000");
});
// Add to your backend (temporarily)
app.delete("/admin/clear-clips", async (req, res) => {
  try {
    await Clip.deleteMany({});
    res.send("✅ All clips deleted.");
  } catch (err) {
    res.status(500).json({ error: "Failed to delete clips." });
  }
});

// 🚀 Start Monitoring
app.get("/start-monitoring", spikeLimiter, (req, res) => {
  const user = req.session.user;
  const token = req.session.access_token;

  if (!user || !token) {
    return res.status(400).send("Missing session or OAuth token");
  }
console.log("satrt......")
  const username = user.login; // extract Twitch username

  activeMonitor = createChatMonitor({
    username,
    oauth: token,
    onSpike: async (tags, message, spikeMeta) => {
      try {
        const { globalSpikeCount, channel, users } = spikeMeta;

        const spike = await Spike.create({
          timestamp: new Date(),
          channel,
          users,
          messageCount: globalSpikeCount,
        });

        io.emit("new_spike", spike);

        const clip = await triggerClipSpike(tags, message, username, spikeMeta); // new
        // updated call
        if (clip) {
          io.emit("new_clip", clip);
        }
      } catch (err) {
        console.error("❌ Error in spike handler:", err.message);
      }
    },
  });

  res.send("✅ Chat monitoring started.");
});

app.post("/api/overlays", (req, res) => {
  const { overlays } = req.body;

  if (!Array.isArray(overlays)) {
    return res.status(400).json({ error: "Invalid overlays format" });
  }

  settings.overlays = overlays;

  fs.writeFileSync(
    path.join(__dirname, "../config/settings.json"),
    JSON.stringify(settings, null, 2)
  );

  res.json({ success: true, overlays });
});

// 🛑 Stop Monitoring
app.get("/stop-monitoring", (req, res) => {
  if (!req.session.user) return res.status(401).send("Unauthorized");

  if (activeMonitor && typeof activeMonitor.stop === "function") {
    activeMonitor.stop(); // Must be defined inside chatMonitor.js
    console.log("🛑 Monitor stopped.");
  }

  activeMonitor = null;
  res.send("🛑 Monitoring stopped.");
});

// 🔊 Server
http.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
