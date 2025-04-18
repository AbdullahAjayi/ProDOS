module.exports = async function safeReply(client, message, text) {
  try {
    await message.reply(text)
  } catch (err) {
    console.warn("message.reply() failed, falling back to sendMessage:", err)
    await client.sendMessage(message.from, text)
  }
}
