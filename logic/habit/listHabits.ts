import { InlineKeyboard } from "grammy";
import { MySessionContext } from "../../bot.js";
import { getHabitsByUser } from "../../db/helpers/habitHelper.js";
import { getUserId } from "../../db/helpers/sessionHelper.js";

const HABITS_PER_PAGE = 10;

// Get streak emoji based on streak count
function getStreakEmoji(streak: number): string {
    if (streak >= 30) return "🔥🔥🔥";
    if (streak >= 14) return "🔥🔥";
    if (streak >= 7) return "🔥";
    if (streak >= 3) return "✨";
    return "🌱";
}

// Check if habit should be done today
function isToday(habit: any): boolean {
    if (!habit.days || habit.days.length === 0) {
        return true;
    }

    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayName = dayNames[today.getDay()];

    return habit.days.includes(todayName);
}

// Check if habit was logged today
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

// Calculate completion percentage based on total completions vs days since creation
function getCompletionPercentage(habit: any): number {
    if (!habit.createdAt) return 0;

    const created = new Date(habit.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreation === 0) return 100;

    const completionRate = (habit.totalCompletions || 0) / daysSinceCreation;
    return Math.min(Math.round(completionRate * 100), 100);
}

// Prioritize habits: "pending today" shows before "done today" which shows before "not today"
function prioritizeHabits(habits: any[]): any[] {
    return habits.sort((a, b) => {
        const aShouldDoToday = isToday(a);
        const bShouldDoToday = isToday(b);
        const aLoggedToday = isLoggedToday(a);
        const bLoggedToday = isLoggedToday(b);

        // Priority 1: "Pending today" (should do but not logged)
        const aPending = aShouldDoToday && !aLoggedToday;
        const bPending = bShouldDoToday && !bLoggedToday;
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;

        // Priority 2: "Done today"
        const aDone = aShouldDoToday && aLoggedToday;
        const bDone = bShouldDoToday && bLoggedToday;
        if (aDone && !bDone) return -1;
        if (!aDone && bDone) return 1;

        // Priority 3: "Not today" (lowest priority)
        return 0;
    });
}

export async function listHabits(ctx: MySessionContext, page: number = 0): Promise<void> {
    const userId = await getUserId(ctx);
    if (!userId) {
        await ctx.reply("Please complete onboarding first with the /start command");
        return;
    }

    const allHabits = await getHabitsByUser(userId);

    if (allHabits.length === 0) {
        await ctx.reply(
            "You don't have any habits yet! 🌱\n\nCreate your first habit with /create_habit"
        );
        return;
    }


    const sortedHabits = prioritizeHabits(allHabits);


    const totalPages = Math.ceil(sortedHabits.length / HABITS_PER_PAGE);
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const startIndex = currentPage * HABITS_PER_PAGE;
    const endIndex = Math.min(startIndex + HABITS_PER_PAGE, sortedHabits.length);
    const habitsToShow = sortedHabits.slice(startIndex, endIndex);

    let message = `<b>📋 Your Habits</b> (Page ${currentPage + 1}/${totalPages})\n\n`;
    const keyboard = new InlineKeyboard();

    habitsToShow.forEach((habit, index) => {
        const streak = habit.streak || 0;
        const streakEmoji = getStreakEmoji(streak);
        const completion = getCompletionPercentage(habit);
        const loggedToday = isLoggedToday(habit);
        const shouldDoToday = isToday(habit);

        let status = "";
        if (loggedToday && shouldDoToday) {
            status = "✅ Done today";
        } else if (shouldDoToday && !loggedToday) {
            status = "⏰ Pending";
        } else if (!shouldDoToday) {
            status = "📅 Not today";
        }

        const globalIndex = startIndex + index + 1;
        message += `${globalIndex}. <b>${habit.name}</b>\n`;
        message += `   ${streakEmoji} Streak: ${streak} days | ${completion}% complete\n`;
        if (habit.reminderTime) {
            message += `   ⏰ Reminder: ${habit.reminderTime}\n`;
        }
        message += `   ${status}\n\n`;


        keyboard.text(`${habit.name}`, `habit_${habit._id}`).row();
    });

    // Pagination buttons
    if (totalPages > 1) {
        const navButtons = [];
        if (currentPage > 0) {
            navButtons.push({ text: "⬅️ Previous", callback_data: `habits_page_${currentPage - 1}` });
        }
        navButtons.push({ text: `${currentPage + 1}/${totalPages}`, callback_data: "noop" });
        if (currentPage < totalPages - 1) {
            navButtons.push({ text: "Next ➡️", callback_data: `habits_page_${currentPage + 1}` });
        }
        keyboard.row(...navButtons);
    }

    message += "\n💡 <i>Tap a habit to log it or manage it</i>";

    await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
    });
}

