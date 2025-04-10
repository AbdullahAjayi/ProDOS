require("dotenv").config()
const { Client, RemoteAuth } = require("whatsapp-web.js")
const qrcode = require("qrcode-terminal")
const { MongoStore } = require("wwebjs-mongo")
const mongoose = require("mongoose")

mongoose.connect(process.env.MONGODB_URI).then(() => {
  const store = new MongoStore({ mongoose: mongoose })

  const client = new Client({
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    authStrategy: new RemoteAuth({ store: store, backupSyncIntervalMs: 300000 }),
  })

  client.once("ready", () => {
    console.log("Client is ready!")
  })

  client.on("qr", (qr) => {
    // Generate and display QR code
    console.log("QR RECEIVED")
    qrcode.generate(qr, { small: true })
  })

  client.on("message_create", (message) => {
    console.log(message.body)
  })

  client.on("message", (message) => {
    if (message.body === "ping") {
      message.reply("🏓 Pong! (RemoteAuth working!)")
    }
  })
  client.initialize()
})
