const safeReply = require("../handlers/safeReply")

module.exports = async (client, message) => {
  try {
    const helpMessage =
      `*ProDOS Help* \n\n` +
      `Here are some commands you can use:\n\n` +
      `*log* <habit name> - Log a new habit\n` +
      `*reminder* <habit name> - Set reminders for a habit\n` +
      `*list habits* - View your logged habits\n` +
      `*delete* <habit name> - Delete a habit\n\n` +
      `*Note:* You can also use the command *help* to see this message again.\n\n` +
      `*ProDOS* is here to help you build habits and stay productive! 💪🏽\n` +
      `If you have any questions or need assistance, feel free to ask! 😊\n\n` +
      `*Happy Habit Tracking!* 🚀`

    await safeReply(client, message, helpMessage)
  } catch (error) {
    console.error("Error sending help message:", error)
    await safeReply(
      client,
      message,
      "❌ An error occurred while sending the help message. Please try again."
    )
  }
}
