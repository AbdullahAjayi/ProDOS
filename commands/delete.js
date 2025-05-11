const safeReply = require("../handlers/safeReply")
const Habit = require("../models/habit")
const userStates = require("../state/session")

module.exports = async (client, message) => {
  const userId = message.from
  const input = message.body.trim().toLowerCase()
  const userState = userStates[userId] || {}

  const parts = input
    .split(" ")
    .slice(1)
    .map((p) => p.trim())
    .filter(Boolean)

  const habitName = parts.join(" ")

  if (!habitName && !userState.step) {
    return safeReply(
      client,
      message,
      "*Please enter a habit name to delete*\nExample: delete exercise"
    )
  }

  console.log("Received message:", input)
  console.log("Current user state:", userState)

  try {
    if (!userState.step) {
      const habit = await Habit.findOne({ userId: message.from, name: habitName })

      if (!habit) {
        return safeReply(
          client,
          message,
          `*${habitName}* not found in your list of habits.\nEnsure you're typing the habit name correctly.\n\nUse the *list* commmand to see your habits`
        )
      }

      //   Set context at the beginning of the flow
      userState.context = "delete"
      userState.step = "confirmation"
      userState.habitName = habitName
      userStates[userId] = userState

      return safeReply(
        client,
        message,
        "Are you sure you want to delete this habit?\nYes/No"
      )
    }

    if (userState.step === "confirmation") {
      if (input === "yes") {
        const { habitName } = userState
        await Habit.deleteOne({ userId: message.from, name: habitName })

        // delete user state
        delete userStates[userId]

        console.log("Habit deleted successfully")

        // successs message
        return safeReply(
          client,
          message,
          `*${
            habitName.charAt(0).toUpperCase() + habitName.slice(1)
          }* has been successfully deleted from your list of habits.`
        )
      } else if (input === "no") {
        delete userStates[userId]
        console.log("Terminated habit deletion process")
        return safeReply(
          client,
          message,
          "Habit deletion process terminated successfully."
        )
      } else {
        console.log("Invalid input", input)
        return safeReply(
          client,
          message,
          "Please respond with 'Yes' or 'No' to confirm or cancel the habit deletion."
        )
      }
    }
  } catch (error) {
    console.log("Error deleting habit", error)
    delete userStates[userId]
    safeReply(
      client,
      message,
      "❌ An error occured while deleting your habit. Please try again"
    )
  }
}
