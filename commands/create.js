const safeReply = require("handlers/safeReply")
const Habit = require("models/Habit")

const userStates = {}

module.exports = async (client, message) => {
  const userId = message.from
  const userState = userStates[userId] || {}
  const input = message.body.trim().toLowerCase()

  const habitName = inputsplit(" ").slice(1).join("_").trim()

  if (!habitName) {
    return safeReply(
      client,
      message,
      "*Please provide a habit name to create.*\nExample: create excercise"
    )
  }
  console.log("Received message:", input)
  console.log("Current user state:", userState)

  try {
    if (!userState.step) {
      userState[userId] = { step: "typePropmpt", habitName }
      console.log("Step: typePrompt | Habit Name:", userStates[userId].habitName)
      return safeReply(
        client,
        message,
        "Is this a *yes-or-no* habit or a *measurable* habit?\n\n1. Yes-or-No\n2. Measurable"
      )
    }

    if (userState.step === "typePrompt") {
      if (input === "1" || input === "yes-or-no") {
        userStates[userId].type = "boolean"
        userStates[userId].step = "frequency"
        console.log("selected type: boolean")
        return safeReply(
          client,
          message,
          "How frequent do you want to track this habit?\n\n1. Daily\n2. Weekly\n3. Monthly"
        )
      } else if (input === "2" || input === "measurable") {
        userStates[userId].type = "measurable"
        userStates[userId].step = "frequency"
        console.log("selected type: measurable")
        return safeReply(
          client,
          message,
          "How frequent do you want to track this habit?\n\n1. Daily\n2. Weekly\n3. Monthly"
        )
      } else {
        console.log("Invalid type input:", input)
        return safeReply(client, message, "Please choose *1* or *2* from the list above.")
      }
    }

    if (userState.step === "frequency") {
      const freqOptions = { 1: "daily", 2: "weekly", 3: "monthly" }
      const freq = freqOptions[input]
      if (!freq) {
        console.log("invalid frequency input:", input)
        return safeReply(
          client,
          message,
          "Please select a number between 1 and 3 for frequency."
        )
      }
      userStates[userId].frequency = freq
      userStates[userId].step = "reminderTime"

      return safeReply(
        client,
        message,
        "What time do you want to be reminded each day? (e.g. 7:00 AM"
      )
    }

    if (userState.step === "reminderTime") {
      const timeRegex = /^([1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i
      if (!timeRegex.test(message.body.trim())) {
        console.log("Invalid time input:", input)
        return safeReply(
          client,
          message,
          "⏱️ Please enter a valid time in the format HH:MM AM/PM (e.g. 7:00 AM)"
        )
      }

      // save final habit
      const { habitName, type, frequency } = userStates[userId]
      const habit = new Habit({
        userId: message.from,
        name: habitName,
        type,
        frequency,
        reminderTime: input,
        streak: 0,
        lastLogged: null,
        phone: message.from.replace(/@.+/, ""),
      })
      await habit.save()

      delete userStates[userId]

      return safeReply(
        client,
        message,
        `✅ *${habit.name}* has been created as a ${type} habit tracked ${frequency}.\nWe'll remind you at ${input}!`
      )
    }
  } catch (error) {
    console.error("Error in habit creation", error)
    return safeReply(
      client,
      message,
      "❌ Something went wrong while creating your habit. Please try again."
    )
  }
}
