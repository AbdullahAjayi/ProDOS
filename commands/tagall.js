const safeReply = require("../handlers/safeReply")

module.exports = async (client, message) => {
  const chat = await message.getChat()

  if (!chat.isGroup) {
    return safeReply(client, message, "❌ This command can only be used in a group.")
  }

  const mentions = []

  for (const participant of chat.participants) {
    try {
      const contact = await client.getContactById(participant.id._serialized)
      if (contact) {
        mentions.push(contact)
      }
    } catch (err) {
      console.error("Failed to get contact:", participant.id._serialized)
    }
  }

  await chat.sendMessage("@everyone!", {
    mentions, // 👈 Silently tags all participants
  })
}
