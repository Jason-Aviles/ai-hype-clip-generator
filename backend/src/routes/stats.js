const express = require("express");
const router = express.Router();
const Clip = require("../models/Clip"); // Adjust path as needed
const Spike = require("../models/Spike");

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 6);

    // 📈 Clips per day
    const clips = await Clip.aggregate([
      {
        $match: { createdAt: { $gte: last7Days } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 🔥 Spikes per hour (past 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const spikes = await Spike.aggregate([
      { $match: { createdAt: { $gte: last24h } } },
      {
        $group: {
          _id: {
            $hour: "$createdAt",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 🎭 Top emotions
    const topEmotions = await Clip.aggregate([
      {
        $group: {
          _id: "$emotion",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 🧑‍💻 Top channels by spikes
    const topChannels = await Spike.aggregate([
      {
        $group: {
          _id: "$channel",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      clipsPerDay: clips,
      spikesPerHour: spikes,
      topEmotions,
      topChannels,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
