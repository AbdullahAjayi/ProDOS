const safeReply = require("../handlers/safeReply")
const Habit = require("../models/habit")
const { formatDate } = require("../utils/helpers")

module.exports = async (client, message) => {
  const args = message.body.split(" ")

  const habitName = args.slice(1).join(" ").trim()

  if (!habitName) {
    return message.reply("*Please provide a habit name to log.*\nExample: log excercise")
  }

  try {
    const phone = message.from.replace(/@.+/, "")
    const habit = await Habit.findOneAndUpdate(
      {
        userId: message.from,
        name: habitName.toLowerCase(),
      },
      {
        $inc: { streak: 1 },
        $set: { lastLogged: new Date(), phone: phone },
      },
      { new: true, upsert: true }
    )

    // success message
    const successMessage =
      `✅ *${habitName.charAt(0).toUpperCase() + habit.name.slice(1)}* logged!\n` +
      `📅 Streak: ${habit.streak} days\n` +
      `⏱️ Last logged: ${formatDate(habit.lastLogged)}`

    await safeReply(client, message, successMessage)
  } catch (error) {
    console.error("Error logging habit:", error)
    await safeReply(
      client,
      message,
      "❌ An error occurred while logging your habit. Please try again."
    )
  }
}
