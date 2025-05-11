const safeReply = require("../handlers/safeReply")
const Habit = require("../models/habit")

const userStates = require("../state/session")
const { addCorrectSuffix } = require("../utils/helpers")

module.exports = async (client, message) => {
  const userId = message.from
  const userState = userStates[userId] || {}
  const input = message.body.trim().toLowerCase()

  const exitCommand = () => {
    delete userStates[userId]
    console.log("Exited habit creation process")
    safeReply(client, message, "Exited habit creation process.")
  }

  // Set a timeout to delete userState after a long period of inactivity
  if (userState.timeout) {
    clearTimeout(userState.timeout)
  }

  userState.timeout = setTimeout(() => {
    if (userStates[userId]) {
      console.log(`Deleting user state for userId: ${userId} due to inactivity.`)
      delete userStates[userId]
    }
  }, 10 * 60 * 1000) // 10 minutes

  const parts = input
    .split(" ")
    .slice(1)
    .map((p) => p.trim())
    .filter(Boolean)
  const habitName = (
    parts[0] === "habit" || parts[0] === "habits" ? parts.slice(1) : parts
  ).join("_")

  let inValidHabitName = false

  if (habitName === "habit" || habitName === "habits") {
    inValidHabitName = true
  }

  if (inValidHabitName)
    return safeReply(client, message, "Habit name can't be 'habit' or 'habits'")

  if (!habitName && !userState.step) {
    return safeReply(
      client,
      message,
      "*Please provide a habit name to create.*\nExample: create excercise or create habit exercise"
    )
  }

  console.log("Received message:", input)
  console.log("Current user state:", userState)

  try {
    if (!userState.step) {
      const existingHabit = await Habit.findOne({ userId, name: habitName })
      if (existingHabit) {
        return safeReply(
          client,
          message,
          `⚠️ You already have a habit named *${habitName.replace(
            /_/g,
            " "
          )}*. Please choose a different name.`
        )
      }

      userState.step = "typeOfHabitPrompt"
      userState.habitName = habitName
      userStates[userId] = userState

      console.log("Step: typeOfHabitPrompt | Habit Name:", userState.habitName)
      return safeReply(
        client,
        message,
        "Is this a *yes-or-no* habit or a *measurable* habit?\n\n1. Yes-or-No\n2. Measurable"
      )
    }

    // type of habit prompt logic
    if (userState.step === "typeOfHabitPrompt") {
      if (input === "1" || input === "yes-or-no") {
        userState.type = "boolean"
        userState.step = "frequency"
        userStates[userId] = userState

        console.log("selected type: boolean")
        return safeReply(
          client,
          message,
          "How frequent do you want to track this habit?\n\n1. Daily\n2. Weekly\n3. Monthly"
        )
      } else if (input === "2" || input === "measurable") {
        userState.type = "measurable"
        userState.step = "frequency"
        userStates[userId] = userState

        console.log("selected type: measurable")
        return safeReply(
          client,
          message,
          "How frequent do you want to track this habit?\n\n1. Daily\n2. Weekly\n3. Monthly"
        )
      } else if (input === "exit") {
        return exitCommand()
      } else {
        console.log("Invalid type input:", input)
        return safeReply(client, message, "Please choose *1* or *2* from the list above.")
      }
    }

    // habit frequency logic
    if (userState.step === "frequency") {
      const freqOptions = {
        1: "daily",
        2: "weekly",
        3: "monthly",
        daily: "daily",
        weekly: "weekly",
        monthly: "monthly",
      }
      const freq = freqOptions[input]
      if (input === "exit") {
        return exitCommand()
      }
      if (!freq) {
        console.log("invalid frequency input:", input)
        return safeReply(
          client,
          message,
          "Please select a number between 1 and 3 for frequency."
        )
      }

      userState.frequency = freq
      userState.step = "reminderTime"
      userStates[userId] = userState

      if (freq === "daily") {
        return safeReply(
          client,
          message,
          "What time do you want to be reminded each day? (e.g. 7 am or 7:30 pm)"
        )
      } else if (freq === "weekly") {
        return safeReply(
          client,
          message,
          "What day of the week do you wish to be reminded? (e.g. Saturday)"
        )
      } else {
        return safeReply(
          client,
          message,
          "What date of the month do you wish to be reminded? (e.g. 21st)"
        )
      }
    }

    // reminder time logic
    if (userState.step === "reminderTime") {
      // when user types 'exit'
      if (input === "exit") {
        return exitCommand()
      }

      // Daily reminder logic
      if (userState.frequency === "daily") {
        const timeRegex = /^(0?[1-9]|1[0-2])(:[0-5][0-9])?\s?(AM|PM)$/i
        if (!timeRegex.test(input)) {
          console.log("Invalid time input:", input)
          return safeReply(
            client,
            message,
            "⏱ Please enter a valid time format using AM/PM (e.g. 7 am or 7:30 pm)."
          )
        }

        // Format the time input
        const match = input.match(timeRegex)
        let hour = match[1]
        let minutes = match[2] || "00"
        const period = match[3]

        if (hour.length === 1) {
          hour = `0${hour}`
        }

        userState.reminderTime = {
          frequency: "daily",
          time: `${hour}:${minutes} ${period}`,
        }
        console.log("Formatted time:", userState.reminderTime)
      }

      // Weekly reminder logic
      if (userState.frequency === "weekly") {
        const validDays = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ]

        // If the user hasn't selected a day yet
        if (!userState.dayOfTheWeek) {
          if (!validDays.includes(input)) {
            console.log("Invalid day input:", input)
            return safeReply(
              client,
              message,
              "📅 Please enter a valid day of the week (e.g. Monday)."
            )
          }

          userState.dayOfTheWeek = input.charAt(0).toUpperCase() + input.slice(1)

          console.log("Selected day for weekly reminder:", userState.dayOfTheWeek)

          return safeReply(
            client,
            message,
            `🕒 What time do you want to be reminded on ${userState.dayOfTheWeek}s? (e.g. 7 am or 7:30 pm)`
          )
        }

        // If the user has already selected a day, prompt for the time
        const timeRegex = /^(0?[1-9]|1[0-2])(:[0-5][0-9])?\s?(AM|PM)$/i
        if (!timeRegex.test(input)) {
          console.log("Invalid time input:", input)
          return safeReply(
            client,
            message,
            "⏱️ Please enter a valid time in the format HH:MM AM/PM (e.g. 7 am or 7:30 pm)."
          )
        }

        // Formate the time input
        const match = input.match(timeRegex)
        let hour = match[1]
        let minutes = match[2] || ":00"
        const period = match[3]

        if (hour.length === 1) {
          hour = `0${hour}`
        }

        // Save the weekly reminder time
        userState.reminderTime = {
          frequency: "weekly",
          day: userState.dayOfTheWeek,
          time: `${hour}${minutes} ${period}`,
        }
        console.log("Formatted weekly reminder time:", userState.reminderTime)
      }

      // Monthly reminder logic
      if (userState.frequency === "monthly") {
        const dateRegex = /^(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?$/i

        // If the user hasn't selected a date yet
        if (!userState.dateOfTheMonth) {
          if (!dateRegex.test(input)) {
            console.log("Invalid date input:", input)
            return safeReply(
              client,
              message,
              "📅 Please enter a valid date of the month (e.g. 21st, 5th)."
            )
          }
          userState.dateOfTheMonth = addCorrectSuffix(input.match(dateRegex)[1])

          console.log("Selected date for monthly reminder:", userState.dateOfTheMonth)

          return safeReply(
            client,
            message,
            `🕒 What time on the ${userState.dateOfTheMonth} do you want to be reminded? (e.g. 7 am or 7:30 pm)`
          )
        }

        // If the user has already selected a date, prompt for the time
        const timeRegex = /^(0?[1-9]|1[0-2])(:[0-5][0-9])?\s?(AM|PM)$/i
        if (!timeRegex.test(input)) {
          console.log("Invalid time input:", input)
          return safeReply(
            client,
            message,
            "⏱️ Please enter a valid time in the format HH:MM AM/PM (e.g. 7 am or 7:30 pm)."
          )
        }

        // Formate the time input
        const match = input.match(timeRegex)
        let hour = match[1]
        let minutes = match[2] || ":00"
        const period = match[3]

        if (hour.length === 1) {
          hour = `0${hour}`
        }

        // Save the monthly reminder time
        userState.reminderTime = {
          frequency: "monthly",
          date: userState.dateOfTheMonth,
          time: `${hour}${minutes} ${period}`,
        }
        console.log("Formatted monthly reminder time:", userState.reminderTime)
      }

      userState.step = "confirmedHabitCreation"
      userStates[userId] = userState

      console.log("Habit confirmation stage. Awaiting user input...")

      // Success message/feedback
      return safeReply(
        client,
        message,
        "Are you sure you want to create this habit?\nYes/No"
      )
    }

    if (userState.step === "confirmedHabitCreation") {
      if (input === "yes") {
        // save final habit
        const { habitName, type, frequency, reminderTime } = userState
        const habit = new Habit({
          userId: message.from,
          name: habitName,
          type,
          frequency,
          reminderTime,
          streak: 0,
          lastLogged: new Date(),
          phone: message.from.replace(/@.+/, ""),
        })
        await habit.save()

        // delete userState globally when done
        delete userStates[userId]

        // Success message/feedback
        console.log("Habit created successfully! ✅")
        return safeReply(
          client,
          message,
          `✅ Your habit has been created successfully!\n\nYou will be tracking *${
            habit.name.charAt(0).toUpperCase() + habit.name.slice(1)
          }* ${frequency}.\n\nI will be reminding you ${
            userState.frequency === "daily"
              ? `by ${reminderTime.time}`
              : userState.frequency === "weekly"
              ? `on ${reminderTime.day}s by ${reminderTime.time}`
              : `on the ${reminderTime.date} of every month by ${reminderTime.time}`
          }!`
        )
      } else if (input === "no") {
        delete userStates[userId]
        console.log("Terminated habit creation process")
        return safeReply(
          client,
          message,
          "Habit creation process terminated successfully."
        )
      } else if (input === "exit") {
        return exitCommand()
      } else {
        console.log("Invalid option", input)
        return safeReply(
          client,
          message,
          "Please respond with 'Yes' or 'No' to confirm or cancel the habit creation."
        )
      }
    }
  } catch (error) {
    console.error(`Error creating habit for ${userId}`, error)
    delete userStates[userId]
    return safeReply(
      client,
      message,
      "❌ Something went wrong while creating your habit. Please try again."
    )
  }
}
