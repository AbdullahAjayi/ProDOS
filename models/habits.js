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
  },
  { timestamps: true }
)

habitSchema.index({ userId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model("Habit", habitSchema)
