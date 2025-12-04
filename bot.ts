import dotenv from "dotenv";
dotenv.config();

import { Bot, Context } from 'grammy';
import { type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { registerOnboarding } from "./onboarding.js";
import createHabit from "./logic/habit/createHabit.js";
import { connectDB } from "./db/index.js";
import { initializeReminderService } from "./logic/reminders/reminderService.js";
import { listHabits } from "./logic/habit/listHabits.js";
import { logHabitSimple } from "./logic/habit/logHabit.js";
// import updateHabitConversation from "./logic/habit/updateHabit";

const BOT_TOKEN = process.env.BOT_TOKEN!;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable not defined')
}

type MyContext = ConversationFlavor<Context>;
export type MySessionContext = MyContext;

async function main() {
  const bot = new Bot<MySessionContext>(BOT_TOKEN);

  const adapter = await connectDB();

  bot.use(conversations({
    // storage: adapter as any
  }));

  // Initialize reminder service (loads reminders in background)
  initializeReminderService(bot as any);

  // Set Bot Commands
  await bot.api.setMyCommands([

    { command: "onboarding", description: "Start onboarding" },

    { command: "help", description: "Show help message" },

    { command: "create_habit", description: "Create a new habit" },

    { command: "list_habits", description: "List all your habits" },

    // { command: "update_habit", description: "Update a habit" },

  ])
    .catch(err => console.log(err))

  // Register the start command
  registerOnboarding(bot);

  // Create habit command
  bot.use(createConversation(createHabit));
  bot.command('create_habit', async (ctx) => await ctx.conversation.enter("createHabit"))

  // List habits command
  bot.command('list_habits', async (ctx) => await listHabits(ctx));

  // Update habit command
  // bot.use(createConversation(updateHabitConversation, "updateHabit"));
  // bot.command('update_habit', async (ctx) => await ctx.conversation.enter("updateHabit"));

  // Handle callback queries for logging habits
  bot.callbackQuery(/^log_habit_(.+)$/, async (ctx) => {
    const habitId = ctx.match[1];
    console.log("habitId", habitId);
    if (habitId) {
      await logHabitSimple(ctx, habitId);
    }
  });

  // Handle callback queries for habit management from list (./logic/habit/listHabits.ts)
  bot.callbackQuery(/^habit_(.+)$/, async (ctx) => {
    const habitId = ctx.match[1];
    await ctx.answerCallbackQuery();

    // Show options for the habit
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Log Habit", callback_data: `log_habit_${habitId}` },
          { text: "📝 Update Habit", callback_data: `update_habit_${habitId}` },
        ],
      ],
    };

    await ctx.reply("What would you like to do?", { reply_markup: keyboard });
  });

  // Handle update habit callback
  bot.callbackQuery(/^update_habit_(.+)$/, async (ctx) => {
    const habitId = ctx.match[1];
    await ctx.conversation.enter("updateHabit", { habitId });
  });

  // Handle skip reminder callback
  bot.callbackQuery(/^skip_reminder_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Reminder skipped", show_alert: false });
  });

  // Handle pagination for habit list
  bot.callbackQuery(/^habits_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1] || "0");
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
    await listHabits(ctx, page);
  });

  // Handle noop callback (for page indicator button)
  bot.callbackQuery("noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });


  // Other text from chat
  bot.on("message:text", (ctx) => {
    ctx.reply(`You said: <b><i>${ctx.msg.text}</i></b>`, {
      parse_mode: 'HTML'
    });
  });

  console.log(".\n.\n.\nProDOS Telegram Bot is running...");

  bot.catch((err) => {
    console.error("Bot error:", err.error);
  });

  bot.start()

}

main().catch(err => {
  console.error('Failed to start bot:', err)
  process.exit(1);
})
