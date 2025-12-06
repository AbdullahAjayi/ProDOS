import { MySessionContext } from "../../bot.js";
import { Habit } from "../../db/models/Habit.js";
import { deleteHabit as deleteHabitFromDB } from "../../db/helpers/habitHelper.js";
import { cancelReminder } from "../reminders/reminderService.js";
import { InlineKeyboard } from "grammy";

/**
 * Delete a habit with confirmation
 */
export async function deleteHabit(ctx: MySessionContext, habitId: string): Promise<void> {
    const habit = await Habit.findById(habitId);

    if (!habit) {
        await ctx.answerCallbackQuery({ text: "❌ Habit not found", show_alert: true });
        return;
    }

    // Show confirmation prompt
    const confirmKeyboard = new InlineKeyboard()
        .text("✅ Yes, delete it", `confirm_delete_${habitId}`)
        .text("❌ Cancel", "cancel_delete");

    await ctx.answerCallbackQuery();
    await ctx.reply(
        `⚠️ Are you sure you want to delete <b>${habit.name}</b>?\n\nThis action cannot be undone. All progress and streak data will be lost.`,
        {
            parse_mode: "HTML",
            reply_markup: confirmKeyboard,
        }
    );
}

/**
 * Confirm and execute habit deletion
 */
export async function confirmDeleteHabit(ctx: MySessionContext, habitId: string): Promise<void> {
    const habit = await Habit.findById(habitId);

    if (!habit) {
        await ctx.answerCallbackQuery({ text: "❌ Habit not found", show_alert: true });
        return;
    }

    const habitName = habit.name;

    // Cancel any scheduled reminders
    cancelReminder(habitId);

    // Delete from database
    await deleteHabitFromDB(habitId);

    await ctx.answerCallbackQuery({ text: "🗑️ Habit deleted", show_alert: false });
    await ctx.editMessageText(
        `🗑️ <b>${habitName}</b> has been deleted.\n\nAll associated data has been removed.`,
        { parse_mode: "HTML" }
    );
}

/**
 * Cancel deletion
 */
export async function cancelDelete(ctx: MySessionContext): Promise<void> {
    await ctx.answerCallbackQuery({ text: "Deletion cancelled", show_alert: false });
    await ctx.editMessageText("❌ Deletion cancelled. Your habit is safe!");
}
