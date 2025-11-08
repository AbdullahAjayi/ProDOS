import dotenv from "dotenv";
dotenv.config();

import { Bot, Context } from 'grammy';
import { type ConversationFlavor, conversations } from "@grammyjs/conversations";
import { registerOnboarding } from "./onboarding";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable not defined')
}

export type MyContext = ConversationFlavor<Context>;

const bot = new Bot<MyContext>(BOT_TOKEN);
bot.use(conversations())

// Set Bot Commands
async function setBotCommands() {
  await bot.api.setMyCommands([
    { command: "start", description: "Start a conversation with me" },
    { command: "help", description: "Show help message" },
    { command: "create_habit", description: "Create an habit ex: create_habit reading" },
  ]);
}
setBotCommands().catch(err => console.log(err))

// Register the start command
registerOnboarding(bot);

// Other text from chat
bot.on("message:text", (ctx) => {
  ctx.reply(`You said: <b><i>${ctx.msg.text}</i></b>`, {
    parse_mode: 'HTML'
  });
});

console.log(".\n.\n.\nProDOS Telegram Bot is running...");
bot.start()