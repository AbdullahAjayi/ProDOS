const Habit = require("../models/habits")

module.exports = async (client, message) => {
  const args = message.body.split(" ")

  if (args[0].toLowerCase() !== "!log") return

  const habitName = args.slice(1).join(" ").trim()

  if (!habitName) {
    return message.reply(`*Please provide a habit name to log.*\nExample: !log excercise`)
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
    const lastLogged = habit.lastLogged?.toDateString() || "This is your first log!"
    message.reply(
      `✅ *${habitName}* logged!\n` +
        `📅 Streak: ${habit.streak} days\n` +
        `⏱️ Last logged: ${lastLogged}`
    )
  } catch (error) {
    console.error("Error logging habit:", error)
    message.reply("❌ An error occurred while logging your habit. Please try again.")
  }
}
