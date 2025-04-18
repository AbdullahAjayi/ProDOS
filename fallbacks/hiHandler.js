const safeReply = require("../handlers/safeReply")
const User = require("../models/user")

const WELCOME_MSG =
  "Hi there! I'm ProDOS, your WhatsApp productivity partner.\nHow can I assist you today? You can ask me to log your habits, set reminders, or check your progress. Just type 'help' for a list of commands."

/* for .help:
    *Here are a list of commands you can use to get started:
    .log — log a new habit  
    .reminder — set or update habit reminders  
    .list habits — see your habits  
    .delete — delete a habit  
  */

module.exports = async (client, message) => {
  const saidHi = message.body.match(/^(hi|hello)( prodos)?$/i)

  if (saidHi) {
    await safeReply(client, message, WELCOME_MSG)
    return true
  }

  return false
}
