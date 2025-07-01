const tmi = require("tmi.js");
const settings = require("../../config/settings.json");
require("dotenv").config();

const SINGLE_TRIGGER_MODE = process.env.SINGLE_TRIGGER_MODE === "true";

function createChatMonitor({ username, oauth, onSpike }) {
  const client = new tmi.Client({
    identity: {
      username,
      password: `oauth:${oauth}`,
    },
    channels: [username],
  });

  const activityMap = {};
  let lastSpikeTime = 0;
  const cooldownMs = settings.cooldownMs || 10000;

  client.connect();

  client.on("message", (channel, tags, message, self) => {
    if (self) return;

    const now = Date.now();
    const user = tags.username || "unknown";

    if (!activityMap[channel]) {
      activityMap[channel] = { messages: [], userMap: {} };
    }

    const data = activityMap[channel];
    data.messages.push({ time: now, user, content: message });
    data.messages = data.messages.filter(
      (msg) => now - msg.time < settings.spikeWindowMs
    );

    if (!data.userMap[user]) data.userMap[user] = [];
    data.userMap[user].push(now);
    data.userMap[user] = data.userMap[user].filter(
      (ts) => now - ts < settings.spikeWindowMs
    );

    const globalSpikeCount = data.messages.length;
    const userSpikeCount = data.userMap[user].length;
    const uniqueUsers = new Set(data.messages.map((m) => m.user));
    const userList = [...uniqueUsers];

    const spamDensity = (globalSpikeCount / settings.spikeWindowMs) * 1000;
    const avgMessageLength =
      data.messages.reduce((acc, m) => acc + m.content.length, 0) /
      (globalSpikeCount || 1);
    const emojiRegex = /[\u{1F600}-\u{1F6FF}]/u;
    const emojiRatio =
      data.messages.filter((m) => emojiRegex.test(m.content)).length /
      (globalSpikeCount || 1);

    const isKeywordTrigger = settings.triggerWords.some((word) =>
      message.toUpperCase().includes(word)
    );

    let shouldTrigger = false;

    if (SINGLE_TRIGGER_MODE) {
      shouldTrigger = isKeywordTrigger && now - lastSpikeTime > cooldownMs;
    } else {
      const spikeByUniqueUsers =
        settings.uniqueUserSpikeThreshold &&
        uniqueUsers.size >= settings.uniqueUserSpikeThreshold;
      const spikeByVolume = globalSpikeCount >= settings.spikeThreshold;
      const spikeByPerUser =
        settings.perUserSpikeThreshold &&
        userSpikeCount >= settings.perUserSpikeThreshold;

      shouldTrigger =
        (isKeywordTrigger ||
          spikeByVolume ||
          spikeByPerUser ||
          spikeByUniqueUsers) &&
        spamDensity > (settings.spamDensityThreshold || 2) &&
        avgMessageLength > (settings.avgMsgLengthThreshold || 3) &&
        emojiRatio > (settings.emojiRatioThreshold || 0.2) &&
        now - lastSpikeTime > cooldownMs;
    }

    if (shouldTrigger) {
      lastSpikeTime = now;

      onSpike(tags, message, {
        globalSpikeCount,
        userSpikeCount,
        uniqueUsers: uniqueUsers.size,
        users: userList,
        channel,
        metrics: {
          spamDensity,
          avgMessageLength,
          emojiRatio,
        },
      });

      activityMap[channel].messages = [];
      activityMap[channel].userMap = {};
    }
  });

  return {
    stop: () => {
      client.removeAllListeners("message");
      client.disconnect();
    },
  };
}

module.exports = { createChatMonitor };
