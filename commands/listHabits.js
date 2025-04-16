const Habits = require("../models/habits")
const { formatDate } = require("../utils/helpers")

module.exports = async (client, message) => {
  try {
    const habits = await Habits.find({ userId: message.from }).sort({ lastLogged: -1 })

    // handle empty habits

    if (!habits.length) {
      return message.reply(
        "*You have no habits logged yet.*\n To log a habit, use the command:\n log <habit name> \n\n Example: log exercise"
      )
    }
    // build response
    let response = `*Your Habits:*\n\n`

    habits.forEach((habit, index) => {
      response +=
        `${index + 1} *${habit.name.charAt(0).toUpperCase() + habit.name.slice(1)}*\n` +
        `🔥Streak: ${habit.streak} days\n` +
        `⏱️ Last logged: ${formatDate(habit.lastLogged)}\n\n`
    })

    // add summary
    response += `*✅ Total: ${habits.length} habits tracked*`

    // send formatted list
    await message.reply(response)
  } catch (error) {
    console.error("Error fetching habits:", error)
    await message.reply(
      "❌ An error occurred while fetching your habits. Please try again."
    )
  }
}
