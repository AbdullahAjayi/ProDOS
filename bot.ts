import dotenv from "dotenv";
dotenv.config();

import { Bot, Context } from 'grammy';
import { type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { registerOnboarding } from "./onboarding";
import createHabit from "./logic/habit/createHabit";
import { connectDB } from "./db";
import { initializeReminderService } from "./logic/reminders/reminderService";
import { listHabits } from "./logic/habit/listHabits";
import { logHabitSimple } from "./logic/habit/logHabit";
import updateReminderConversation from "./logic/reminders/updateReminder";

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

  // Initialize reminder service
  initializeReminderService(bot as any);

  // Set Bot Commands
  await bot.api.setMyCommands([

    { command: "start", description: "Start a conversation with me" },

    { command: "help", description: "Show help message" },

    { command: "create_habit", description: "Create a new habit" },

    { command: "list_habits", description: "List all your habits" },

    { command: "update_reminder", description: "Update reminder for a habit" },

  ])
    .catch(err => console.log(err))

  // Register the start command
  registerOnboarding(bot);

  // Create habit command
  bot.use(createConversation(createHabit));
  bot.command('create_habit', async (ctx) => await ctx.conversation.enter("createHabit"))

  // List habits command
  bot.command('list_habits', async (ctx) => await listHabits(ctx));

  // Update reminder command
  bot.use(createConversation(updateReminderConversation, "updateReminder"));
  bot.command('update_reminder', async (ctx) => await ctx.conversation.enter("updateReminder"));

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
          { text: "⏰ Update Reminder", callback_data: `update_reminder_${habitId}` },
        ],
      ],
    };

    await ctx.reply("What would you like to do?", { reply_markup: keyboard });
  });

  // Handle skip reminder callback
  bot.callbackQuery(/^skip_reminder_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Reminder skipped", show_alert: false });
  });

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
