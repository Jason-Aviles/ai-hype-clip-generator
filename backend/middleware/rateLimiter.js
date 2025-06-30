// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// Limit to 1 spike/clip every 10 seconds per IP
const spikeLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1,
  message: {
    error: "⏳ Slow down — you’re creating clips too fast!",
  },
});

module.exports = { spikeLimiter };
