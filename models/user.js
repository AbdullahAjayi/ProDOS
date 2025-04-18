const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    name: String,
    onboarded: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastActive: Date,
    preferences: {
      timeZone: { type: String, default: "Africa/Lagos" },
      reminderOptIn: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("User", userSchema)
