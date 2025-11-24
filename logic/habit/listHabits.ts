import { InlineKeyboard } from "grammy";
import { MySessionContext } from "../../bot.js";
import { getHabitsByUser } from "../../db/helpers/habitHelper.js";
import { getUserId } from "../../db/helpers/sessionHelper.js";

/**
 * Get streak emoji based on streak count
 */
function getStreakEmoji(streak: number): string {
    if (streak >= 30) return "🔥🔥🔥";
    if (streak >= 14) return "🔥🔥";
    if (streak >= 7) return "🔥";
    if (streak >= 3) return "✨";
    return "🌱";
}

/**
 * Check if habit should be done today
 */
function isToday(habit: any): boolean {
    if (!habit.days || habit.days.length === 0) {
        return true; // Daily habit
    }

    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayName = dayNames[today.getDay()];

    return habit.days.includes(todayName);
}

/**
 * Check if habit was logged today
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
 * Calculate completion percentage (simplified - based on streak vs days since creation)
 */
function getCompletionPercentage(habit: any): number {
    if (!habit.createdAt) return 0;

    const created = new Date(habit.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreation === 0) return 100;

    const completionRate = (habit.totalCompletions || 0) / daysSinceCreation;
    return Math.min(Math.round(completionRate * 100), 100);
}

/**
 * Format habit list message
 */
export async function listHabits(ctx: MySessionContext): Promise<void> {
    const userId = await getUserId(ctx);
    if (!userId) {
        await ctx.reply("Please complete onboarding first with the /start command");
        return;
    }

    const habits = await getHabitsByUser(userId);

    if (habits.length === 0) {
        await ctx.reply(
            "You don't have any habits yet! 🌱\n\nCreate your first habit with /create_habit"
        );
        return;
    }

    let message = "<b>📋 Your Habits</b>\n\n";
    const keyboard = new InlineKeyboard();

    habits.forEach((habit, index) => {
        const streak = habit.streak || 0;
        const streakEmoji = getStreakEmoji(streak);
        const completion = getCompletionPercentage(habit);
        const loggedToday = isLoggedToday(habit);
        const shouldDoToday = isToday(habit);

        // Status indicator
        let status = "";
        if (loggedToday && shouldDoToday) {
            status = "✅ Done today";
        } else if (shouldDoToday && !loggedToday) {
            status = "⏰ Pending";
        } else if (!shouldDoToday) {
            status = "📅 Not today";
        }

        // Build habit line
        message += `${index + 1}. <b>${habit.name}</b>\n`;
        message += `   ${streakEmoji} Streak: ${streak} days | ${completion}% complete\n`;
        if (habit.reminderTime) {
            message += `   ⏰ Reminder: ${habit.reminderTime}\n`;
        }
        message += `   ${status}\n\n`;

        // Add inline buttons for each habit
        keyboard.text(`${habit.name}`, `habit_${habit._id}`).row();
    });

    message += "\n💡 <i>Tap a habit to log it or manage it</i>";

    await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

