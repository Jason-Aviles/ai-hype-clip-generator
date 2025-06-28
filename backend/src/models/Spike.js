const mongoose = require("mongoose");

const spikeSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  channel: String,
  messageCount: Number,
  uniqueUsers: Number,
  triggerMessage: String,
});

module.exports = mongoose.model("Spike", spikeSchema);
