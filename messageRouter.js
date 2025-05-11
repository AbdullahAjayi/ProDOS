const commands = {
  log: require("./commands/logHabits"),
  list: require("./commands/listHabits"),
  help: require("./commands/help"),
  create: require("./commands/create"),
  delete: require("./commands/delete"),
}

const fallbacks = [require("./fallbacks/hiHandler")]
const userStates = require("./state/session")

module.exports = async (client, message) => {
  const userId = message.from

  // Check if user has an ongoing state (e.g., during create habit flow)
  const userState = userStates[userId]
  // ✅ Route to the appropriate handler based on ongoing userState.context
  if (userState && userState.step && userState.context) {
    const contextHandler = commands[userState.context]
    if (contextHandler) {
      return contextHandler(client, message)
    }
  }

  // Otherwise route normally
  let commandKey = message.body.split(" ")[0].toLowerCase()
  commandKey = commandKey.startsWith(".") ? commandKey.slice(1) : commandKey

  if (commandKey in commands) {
    await commands[commandKey](client, message)
    return
  }

  for (const handler of fallbacks) {
    const handled = await handler(client, message)
    if (handled) {
      break
    }
  }
}

module.exports.commands = commands
