const mongoose = require("mongoose");

const ChatHistorySchema = new mongoose.Schema(
  {
    userId: String,
    roomId: String,
    sender: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
    "ChatHistory",
    ChatHistorySchema
);
