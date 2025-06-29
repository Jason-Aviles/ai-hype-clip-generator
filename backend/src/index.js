require("dotenv").config();
const express = require("express");
const session = require("cookie-session");
const { triggerClipSpike } = require("./services/clipEngine");
const Spike = require("./models/Spike");
const Clip = require("./models/Clip");
const mongoose = require("mongoose");
const { createChatMonitor } = require("./services/chatMonitor");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

mongoose
  .connect("mongodb://127.0.0.1:27017/hypeclip", {
    useNewUrlParser: true,
  })
  .then(() => console.log("🧠 Connected to MongoDB"))
  .catch(console.error);

app.use(
  session({
    name: "session",
    keys: ["secret1", "secret2"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

app.use("/auth/twitch", require("./auth/twitch"));

app.get("/api/clips", async (req, res) => {
  try {
    const clips = await Clip.find().sort({ createdAt: -1 });
    res.json(clips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching clips" });
  }
});

app.get("/api/spikes", async (req, res) => {
  try {
    const spikes = await Spike.find().sort({ createdAt: -1 }).limit(50);
    res.json(spikes);
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Stats fetch failed" });
  }
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/twitch/login");
  res.send(`Welcome ${req.session.user.display_name}`);
});

app.get("/start-monitoring", (req, res) => {
  const user = req.session.user;
  const token = req.session.access_token;

  if (!user || !token) {
    return res.status(400).send("Missing session or OAuth token");
  }

  createChatMonitor({
    username: user.login,
    oauth: token,
    onSpike: async (tags, message, spikeMeta) => {
      console.log(
        `🔥 Chat spike triggered by ${tags["display-name"]}: ${message}`
      );

      const { globalSpikeCount, uniqueUsers, channel, users } = spikeMeta;

      const spike = await Spike.create({
        timestamp: new Date(),
        channel,
        users,
        messageCount: globalSpikeCount,
      });

      io.emit("new_spike", spike); // 🔴 Emit real-time spike data

      const clip = await triggerClipSpike(tags, message);

      if (clip) {
        io.emit("new_clip", clip); // 🔴 Emit real-time clip data
      }
    },
  });

  res.send("✅ Chat monitoring started.");
});

http.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
