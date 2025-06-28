const mongoose = require("mongoose");

const clipSchema = new mongoose.Schema({
  username: String,
  message: String,
  filePath: String,
  type: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Clip", clipSchema);
