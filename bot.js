require("dotenv").config()
const { Client, RemoteAuth } = require("whatsapp-web.js")
const qrcode = require("qrcode-terminal")
const { MongoStore } = require("wwebjs-mongo")
const mongoose = require("mongoose")

const logHabits = require("./commands/logHabits")
const listHabits = require("./commands/listHabits")
const onboarding = require("./commands/onboarding")

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
    await logHabits(client, message)
    await listHabits(client, message)
    await onboarding(client, message)
  })
  client.initialize()
})
