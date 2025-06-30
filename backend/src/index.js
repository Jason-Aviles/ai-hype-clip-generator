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
    const totalClips = await Clip.countDocuments();
    const viralClips = await Clip.countDocuments({ viral: true });
    const totalSpikes = await Spike.countDocuments();
    res.json({ totalClips, viralClips, totalSpikes });
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

  activeMonitor = createChatMonitor({
    username: user.login,
    oauth: token,
    onSpike: async (tags, message, spikeMeta) => {
      const { globalSpikeCount, channel, users } = spikeMeta;

      const spike = await Spike.create({
        timestamp: new Date(),
        channel,
        users,
        messageCount: globalSpikeCount,
      });

      io.emit("new_spike", spike);

      const clip = await triggerClipSpike(tags, message);
      if (clip) {
        io.emit("new_clip", clip);
      }
    },
  });

  res.send("✅ Chat monitoring started.");
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
