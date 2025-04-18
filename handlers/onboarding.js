const User = require("../models/user")

module.exports = async function findOrCreateUser(userId, name) {
  const phone = userId.replace(/@.+/, "")
  const user = await User.findOneAndUpdate(
    { userId },
    { $setOnInsert: { name, phone, onboarded: false } },
    { upsert: true, new: true }
  )

  return user
}
