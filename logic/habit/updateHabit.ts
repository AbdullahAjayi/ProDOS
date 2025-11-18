import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Keyboard } from "grammy";
import { MySessionContext } from "../../bot";
import { getHabitsByUser } from "../../db/helpers/habitHelper";
import { getUserId } from "../../db/helpers/sessionHelper";
import { updateReminder as updateReminderSchedule } from "../reminders/reminderService";
import { Habit } from "../../db/models/Habit";
import { delay } from "../../utils/helpers";

// Helper to get days keyboard (reused from createHabit)
function getDaysKeyboard(selectedDays: string[]) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const keyboard = new InlineKeyboard();

    days.forEach((day, index) => {
        const isSelected = selectedDays.includes(day);
        keyboard.text(isSelected ? `✅ ${day}` : day, day);
        if ((index + 1) % 3 === 0) keyboard.row();
    });

    keyboard.row().text("✅ Done", "done");
    return keyboard;
}

async function updateHabitConversation(
    conversation: Conversation<MySessionContext, MySessionContext>,
    ctx: MySessionContext
) {
    // Get user's habits
    const habits = await conversation.external(async () => {
        const userId = await getUserId(ctx);
        if (!userId) {
            throw new Error("User ID not found. Please complete onboarding first.");
        }
        const userHabits = await getHabitsByUser(userId);
        // Convert to plain objects for serialization
        return userHabits.map(habit => habit.toObject ? habit.toObject() : habit);
    });

    if (habits.length === 0) {
        await ctx.reply("You don't have any habits yet. Create one with /create_habit");
        return;
    }

    // Let user select which habit to update
    await ctx.reply("Which habit would you like to update?", {
        reply_markup: new InlineKeyboard(
            habits.map((habit, index) => [
                {
                    text: `${index + 1}. ${habit.name}${habit.reminderTime ? ` (${habit.reminderTime})` : " (no reminder)"}`,
                    callback_data: `update_habit_${habit._id}`,
                },
            ])
        ),
    });

    const habitSelection = await conversation.waitFor("callback_query:data");
    await habitSelection.answerCallbackQuery();

    // Extract and store habitId as a plain string BEFORE external() call
    const habitId: string = habitSelection.callbackQuery.data.replace("update_habit_", "");

    // Get the selected habit
    const selectedHabit = await conversation.external(async () => {
        const habit = await Habit.findById(habitId);
        // Convert to plain object for serialization
        return habit ? (habit.toObject ? habit.toObject() : habit) : null;
    });

    if (!selectedHabit) {
        await ctx.reply("Habit not found.");
        return;
    }

    // Ask what to update
    await ctx.reply(
        `What would you like to update for <b>${selectedHabit.name}</b>?`,
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
                .text("⏰ Reminder Time", "update_time")
                .text("📅 Days", "update_days")
                .row()
                .text("Both", "update_both"),
        }
    );

    const updateChoice = await conversation.waitFor("callback_query:data");
    await updateChoice.answerCallbackQuery();

    let newTime: string | undefined;
    let newDays: string[] | undefined;

    // Update time
    if (updateChoice.callbackQuery.data === "update_time" || updateChoice.callbackQuery.data === "update_both") {
        await ctx.reply(
            `What time would you like to be reminded about <b>${selectedHabit.name}</b>?`,
            {
                parse_mode: "HTML",
                reply_markup: new Keyboard()
                    .text("🌅 6:00 AM")
                    .text("☀️ 9:00 AM")
                    .row()
                    .text("🌇 6:00 PM")
                    .text("🌙 9:00 PM")
                    .row()
                    .text("⏰ Custom Time")
                    .resized(),
            }
        );

        const timeRes = await conversation.waitFor("message:text");
        const chosenTime = timeRes.message.text.trim();

        if (chosenTime === "⏰ Custom Time") {
            await timeRes.reply(
                "Please type your preferred reminder time in 12-hour format (e.g., 7:00 AM, 9:30 PM):",
                { reply_markup: { remove_keyboard: true } }
            );

            const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

            while (true) {
                const customRes = await conversation.waitFor("message:text");
                newTime = customRes.message.text.trim();
                const normalized = newTime.replace(/[^\d:APMapm ]/g, "").trim();

                if (!timePattern.test(normalized)) {
                    await customRes.reply(
                        "⚠️ That doesn't look like a valid time. Please try again (e.g., 7:00 AM)."
                    );
                    continue;
                }

                newTime = normalized;
                break;
            }
        } else {
            let normalized = chosenTime.replace(/[^\d:APMapm ]/g, "").trim();
            const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

            while (!timePattern.test(normalized)) {
                await ctx.reply("⚠️ That doesn't look like a valid time. Please try again (e.g., 7:00 AM).");
                const newTimeRes = await conversation.waitFor("message:text");
                normalized = newTimeRes.message.text.replace(/[^\d:APMapm ]/g, "").trim();
            }
            newTime = normalized;
        }
    }

    // Update days
    if (updateChoice.callbackQuery.data === "update_days" || updateChoice.callbackQuery.data === "update_both") {
        let selectedDays: string[] = selectedHabit.days || [];
        let message = await ctx.reply(
            "📆 Select the days you want to track this habit (tap to toggle) 👇\n\nClick ✅Done when you're done",
            { reply_markup: getDaysKeyboard(selectedDays) }
        );

        while (true) {
            const dayRes = await conversation.waitFor("callback_query:data");
            const data = dayRes.callbackQuery.data;

            if (data === "done") {
                await dayRes.answerCallbackQuery({ text: "Days saved!" });
                newDays = selectedDays;
                break;
            }

            if (selectedDays.includes(data)) {
                selectedDays = selectedDays.filter((d) => d !== data);
                await dayRes.answerCallbackQuery({ text: `Removed ${data} ❌`, show_alert: false });
            } else {
                selectedDays.push(data);
                await dayRes.answerCallbackQuery({ text: `Added ${data} ✅`, show_alert: false });
            }

            await dayRes.api.editMessageReplyMarkup(message.chat.id, message.message_id, {
                reply_markup: getDaysKeyboard(selectedDays),
            });
        }
    }

    // Update the habit
    await conversation.external(async () => {
        await updateReminderSchedule(habitId, newTime, newDays);
    });

    await delay(500, 1000);
    await ctx.reply(
        `✅ Habit updated for <b>${selectedHabit.name}</b>!${newTime ? `\n⏰ New time: ${newTime}` : ""
        }${newDays ? `\n📅 Days: ${newDays.join(", ")}` : ""}`,
        {
            parse_mode: "HTML",
            reply_markup: { remove_keyboard: true },
        }
    );
}

export default updateHabitConversation;
