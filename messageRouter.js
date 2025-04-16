const commands = {
  log: require("./commands/logHabits"),
  list: require("./commands/listHabits"),
}

const fallbacks = [require("./fallbacks/hiHandler")]

module.exports = async (client, message) => {
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
    } else {
      await message.reply("I haven't learned how to do that yet. Please try again later.")
    }
  }
}
