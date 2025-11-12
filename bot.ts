import dotenv from "dotenv";
dotenv.config();

import { Bot, Context, session, SessionFlavor } from 'grammy';
import { type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { registerOnboarding } from "./onboarding";
import createHabit from "./logic/habit/createHabit";
import { connectDB, SessionData } from "./db";

const BOT_TOKEN = process.env.BOT_TOKEN!;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable not defined')
}

type MyContext = ConversationFlavor<Context>;
export type MySessionContext = MyContext & SessionFlavor<SessionData>;

async function main() {
  const bot = new Bot<MySessionContext>(BOT_TOKEN);

  const adapter = await connectDB()
  bot.use(session({
    initial: (): SessionData => ({
      onboardingComplete: false,
    }),
    storage: adapter
  }))

  bot.use(conversations())

  // Set Bot Commands
  await bot.api.setMyCommands([
    { command: "start", description: "Start a conversation with me" },
    { command: "help", description: "Show help message" },
    { command: "create_habit", description: "Create a new habit" },
  ])
    .catch(err => console.log(err))

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
}

main().catch(err => {
  console.error('Failed to start bot:', err)
  process.exit(1);
})
