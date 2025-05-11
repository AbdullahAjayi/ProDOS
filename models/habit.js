const mongoose = require("mongoose")

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastLogged: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ["boolean", "measurable"],
      default: "yesno",
    },
    target: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      default: null,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "daily",
    },
    reminderTime: {
      type: Object,
      default: null, // Example: { frequency: "daily", time: "07:00 AM" }
    },
  },
  { timestamps: true }
)

habitSchema.index({ userId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model("Habit", habitSchema)
