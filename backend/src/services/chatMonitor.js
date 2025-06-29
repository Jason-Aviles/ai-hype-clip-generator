const tmi = require("tmi.js");
const settings = require("../../config/settings.json");

function createChatMonitor({ username, oauth, onSpike }) {
  const client = new tmi.Client({
    identity: {
      username,
      password: `oauth:${oauth}`,
    },
    channels: [username],
  });

  // Map of activity per channel
  const activityMap = {}; // channel => { messages: [], userMap: {} }

  client.connect();

  client.on("message", (channel, tags, message, self) => {
    if (self) return;

    const now = Date.now();
    const user = tags.username || "unknown";

    if (!activityMap[channel]) {
      activityMap[channel] = {
        messages: [],
        userMap: {},
      };
    }

    const data = activityMap[channel];

    // Track global messages
    data.messages.push({ time: now, user });
    data.messages = data.messages.filter(
      (msg) => now - msg.time < settings.spikeWindowMs
    );

    // Track per-user messages
    if (!data.userMap[user]) data.userMap[user] = [];
    data.userMap[user].push(now);
    data.userMap[user] = data.userMap[user].filter(
      (ts) => now - ts < settings.spikeWindowMs
    );

    // Metrics
    const globalSpikeCount = data.messages.length;
    const userSpikeCount = data.userMap[user].length;
    const uniqueUsers = new Set(data.messages.map((m) => m.user));
    const userList = [...uniqueUsers];

    const isTrigger = settings.triggerWords.some((word) =>
      message.toUpperCase().includes(word)
    );

    const shouldTrigger =
      isTrigger ||
      globalSpikeCount >= settings.spikeThreshold ||
      (settings.perUserSpikeThreshold &&
        userSpikeCount >= settings.perUserSpikeThreshold) ||
      (settings.uniqueUserSpikeThreshold &&
        uniqueUsers.size >= settings.uniqueUserSpikeThreshold);

    if (shouldTrigger) {
      onSpike(tags, message, {
        globalSpikeCount,
        userSpikeCount,
        uniqueUsers: uniqueUsers.size,
        users: userList, // ✅ pass user list here
        channel,
      });

      // Optional: reset for next spike window
      activityMap[channel].messages = [];
      activityMap[channel].userMap = {};
    }
  });

  return client;
}

module.exports = { createChatMonitor };
