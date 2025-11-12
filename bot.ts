import dotenv from "dotenv";
dotenv.config();

import { Bot, Context } from 'grammy';
import { type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { registerOnboarding } from "./onboarding";
import createHabit from "./logic/habit/createHabit";

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
    { command: "create_habit", description: "Create a new habit" },
  ]);
}
setBotCommands().catch(err => console.log(err))

// Register the start command
registerOnboarding(bot);

// Create habit command
bot.use(createConversation(createHabit));
bot.command('create_habit', async (ctx) => await ctx.conversation.enter("createHabit"))

// Other text from chat
bot.on("message:text", (ctx) => {
  ctx.reply(`You said: <b><i>${ctx.msg.text}</i></b>`, {
    parse_mode: 'HTML'
  });
});

console.log(".\n.\n.\nProDOS Telegram Bot is running...");
bot.start()
