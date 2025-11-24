import { type Conversation } from "@grammyjs/conversations";
import { MySessionContext } from "../../bot.js";
import { Habit } from "../../db/models/Habit.js";
import { cancelReminder } from "../reminders/reminderService.js";

/**
 * Check if habit was already logged today
 */
function isLoggedToday(habit: any): boolean {
    if (!habit.lastLoggedAt) {
        return false;
    }

    const lastLogged = new Date(habit.lastLoggedAt);
    const today = new Date();

    return (
        lastLogged.getDate() === today.getDate() &&
        lastLogged.getMonth() === today.getMonth() &&
        lastLogged.getFullYear() === today.getFullYear()
    );
}

/**
 * Calculate new streak
 */
function calculateStreak(habit: any, wasLoggedYesterday: boolean): number {
    const currentStreak = habit.streak || 0;

    if (wasLoggedYesterday) {
        // Continue streak
        return currentStreak + 1;
    } else {
        // Reset streak (or start new one)
        return 1;
    }
}

/**
 * Check if habit was logged yesterday
 */
function wasLoggedYesterday(habit: any): boolean {
    if (!habit.lastLoggedAt) {
        return false;
    }

    const lastLogged = new Date(habit.lastLoggedAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return (
        lastLogged.getDate() === yesterday.getDate() &&
        lastLogged.getMonth() === yesterday.getMonth() &&
        lastLogged.getFullYear() === yesterday.getFullYear()
    );
}

/**
 * Log a habit (simple version for callback queries)
 */
export async function logHabitSimple(ctx: MySessionContext, habitId: string): Promise<void> {
    const habit = await Habit.findById(habitId);
    if (!habit) {
        await ctx.reply("Habit not found.");
        return;
    }

    // Check if already logged today
    if (isLoggedToday(habit)) {
        await ctx.answerCallbackQuery({ text: "✅ Already logged today!", show_alert: false });
        return;
    }

    // Update habit
    const wasYesterday = wasLoggedYesterday(habit);
    const newStreak = calculateStreak(habit, wasYesterday);

    habit.lastLoggedAt = new Date();
    habit.streak = newStreak;
    habit.totalCompletions = (habit.totalCompletions || 0) + 1;
    await habit.save();

    // Cancel reminder for today if it hasn't been sent yet
    cancelReminder(habitId);

    const streakEmoji = newStreak >= 7 ? "🔥" : newStreak >= 3 ? "✨" : "🌱";
    await ctx.answerCallbackQuery({
        text: `✅ Logged! ${streakEmoji} Streak: ${newStreak} days`,
        show_alert: false,
    });

    // Update the message or send confirmation
    await ctx.reply(
        `✅ <b>${habit.name}</b> logged!\n\n${streakEmoji} Your streak: <b>${newStreak} days</b>\n📊 Total completions: ${habit.totalCompletions}`,
        { parse_mode: "HTML" }
    );
}

/**
 * Log a measurable habit (conversation version)
 */
export async function logMeasurableHabit(
    conversation: Conversation<MySessionContext, MySessionContext>,
    ctx: MySessionContext,
    habit: any
): Promise<void> {
    await ctx.reply(
        `How much did you do for <b>${habit.name}</b>?${habit.target ? `\n(Your target is ${habit.target} ${habit.unit})` : ""}`,
        { parse_mode: "HTML" }
    );

    while (true) {
        const valueRes = await conversation.waitFor("message:text");
        const input = valueRes.message.text.trim();
        const parsed = Number(input);

        if (isNaN(parsed) || parsed < 0) {
            await valueRes.reply("⚠️ Please enter a valid number.");
            continue;
        }

        // Update habit
        const wasYesterday = wasLoggedYesterday(habit);
        const newStreak = calculateStreak(habit, wasYesterday);

        habit.lastLoggedAt = new Date();
        habit.streak = newStreak;
        habit.totalCompletions = (habit.totalCompletions || 0) + 1;
        await habit.save();

        // Cancel reminder
        cancelReminder(habit._id.toString());

        // Check if target was met
        let message = `✅ Logged: <b>${parsed} ${habit.unit}</b> for <b>${habit.name}</b>`;
        if (habit.target) {
            if (parsed >= habit.target) {
                message += `\n🎯 Target met! Great job!`;
            } else {
                message += `\n📊 ${parsed}/${habit.target} ${habit.unit} (${Math.round((parsed / habit.target) * 100)}%)`;
            }
        }

        const streakEmoji = newStreak >= 7 ? "🔥" : newStreak >= 3 ? "✨" : "🌱";
        message += `\n\n${streakEmoji} Streak: <b>${newStreak} days</b>`;

        await ctx.reply(message, { parse_mode: "HTML" });
        break;
    }
}

