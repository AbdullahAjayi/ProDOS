const safeReply = require("../handlers/safeReply")
const Habit = require("../models/habit")

module.exports = async (client, message) => {
  const input = message.body.trim().toLowerCase()

  const parts = input
    .split(" ")
    .slice(1)
    .map((p) => p.trim())
    .filter(Boolean)

  const habitName = parts.join(" ")

  if (!habitName) {
    return safeReply(
      client,
      message,
      "*Please enter a habit name to delete*\nExample: delete exercise"
    )
  }
  const habit = await Habit.findOne({ userId: message.from, name: habitName })

  if (!habit) {
    return safeReply(
      client,
      message,
      `*${habitName}* not found in your list of habits.\nEnsure you're typing the habit name correctly.\n\nUse the *list* commmand to see your habits`
    )
  }

  if (habit) {
    await Habit.deleteOne({ userId: message.from, name: habitName })
    return safeReply(
      client,
      message,
      `*${
        habit.name.charAt(0).toUpperCase() + habit.name.slice(1)
      }* has been successfully deleted from your list of habits.`
    )
  }
}
