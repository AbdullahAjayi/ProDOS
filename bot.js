require("dotenv").config()
const { Client, RemoteAuth } = require("whatsapp-web.js")
const qrcode = require("qrcode-terminal")
const { MongoStore } = require("wwebjs-mongo")
const mongoose = require("mongoose")
const messageRouter = require("./messageRouter")

const findOrCreateUser = require("./handlers/onboarding")
const safeReply = require("./handlers/safeReply")

const WELCOME_MSG =
  "👋🏽 Hey there! I’m *ProDOS* — your WhatsApp productivity partner.\n" +
  "Ready to help you build habits, set reminders, and hit your goals 🚀\n\n" +
  "*Here are a few commands to get started:*\n" +
  "* *create* — create a new habit\n" +
  "* *log* — log an existing habit\n" +
  "* *reminder* — set habit reminders\n" +
  "* *list habits* — view your habits\n" +
  "* *delete* — delete a habit\n\n" +
  "Just type any of the commands above and let’s go! 💪🏽"

mongoose.connect(process.env.MONGODB_URI).then(() => {
  const store = new MongoStore({ mongoose: mongoose })

  const client = new Client({
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    authStrategy: new RemoteAuth({ store: store, backupSyncIntervalMs: 300000 }),
  })

  client.once("ready", () => {
    console.log("ProDOS Habit Tracker is ready!")
  })

  client.on("qr", (qr) => {
    // Generate and display QR code
    console.log("QR RECEIVED")
    qrcode.generate(qr, { small: true })
  })

  client.on("message", async (message) => {
    const user = await findOrCreateUser(message.from, message._data.notifyName || "User")

    if (!user.onboarded) {
      await safeReply(client, message, WELCOME_MSG)
      user.onboarded = true
      await user.save()

      return
    }

    messageRouter(client, message)
  })
  client.initialize()
})
