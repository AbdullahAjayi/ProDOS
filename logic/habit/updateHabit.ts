import { type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Keyboard } from "grammy";
import { MySessionContext } from "../../bot.js";
import { scheduleReminder, cancelReminder } from "../reminders/reminderService.js";
import { Habit } from "../../db/models/Habit.js";
import { delay } from "../../utils/helpers.js";
import { User } from "../../db/models/User.js";

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

async function updateHabit(
    conversation: Conversation<MySessionContext, MySessionContext>,
    ctx: MySessionContext,
    habitId: string
) {
    // Get the selected habit
    const selectedHabit = await conversation.external(async () => {
        const habit = await Habit.findById(habitId);
        return habit ? (habit.toObject ? habit.toObject() : habit) : null;
    });

    if (!selectedHabit) {
        await ctx.reply("Habit not found.");
        return;
    }

    const isYesNo = selectedHabit.type === "Yes-or-No";
    const isMeasurable = selectedHabit.type === "Measurable";

    // Build update options based on habit type
    const keyboard = new InlineKeyboard();
    keyboard.text("✏️ Habit Name", "update_name");
    keyboard.text("🏷️ Habit Type", "update_type").row();
    keyboard.text("🗓️ Frequency/Days", "update_frequency").row();

    if (isMeasurable) {
        keyboard.text("🎯 Target", "update_target");
        keyboard.text("📏 Unit", "update_unit").row();
    }

    keyboard.text("⏰ Reminder Time", "update_reminder").row();

    // Ask what to update
    await ctx.reply(
        `What would you like to update for <b>${selectedHabit.name}</b>?`,
        {
            parse_mode: "HTML",
            reply_markup: keyboard,
        }
    );

    const updateChoice = await conversation.waitFor("callback_query:data");
    await updateChoice.answerCallbackQuery();
    const choice = updateChoice.callbackQuery.data;

    let updates: any = {};

    // Handle different update choices
    switch (choice) {
        case "update_name":
            await ctx.reply("What would you like to rename this habit to?");
            const nameRes = await conversation.waitFor("message:text");
            updates.name = nameRes.message.text.trim();
            break;

        case "update_type":
            await ctx.reply(
                "What type should this habit be?",
                {
                    reply_markup: new InlineKeyboard()
                        .text("📈 Measurable", "measurable")
                        .text("✅ Yes-or-no", "yesno"),
                }
            );
            const typeRes = await conversation.waitFor("callback_query:data");
            await typeRes.answerCallbackQuery();
            const newType = typeRes.callbackQuery.data;

            if (newType === "measurable") {
                updates.type = "Measurable";

                // Ask for unit
                await ctx.reply("What's the <b>unit</b> for this habit? (e.g. pages, minutes, pushups)", {
                    parse_mode: "HTML",
                });
                const unitRes = await conversation.waitFor("message:text");
                updates.unit = unitRes.message.text.trim();

                // Ask for target
                await ctx.reply("What's your <b>target</b> for each session?", {
                    parse_mode: "HTML",
                });

                while (true) {
                    const targetRes = await conversation.waitFor("message:text");
                    const input = targetRes.message.text.trim();
                    const parsed = Number(input);

                    if (!isNaN(parsed) && parsed > 0) {
                        updates.target = parsed;
                        await ctx.reply(`Got it! Your goal is ${parsed} ${updates.unit} per session.`);
                        break;
                    } else {
                        await targetRes.reply("⚠️ Please enter a valid number (e.g. 10, 25, 100).");
                    }
                }
            } else {
                updates.type = "Yes-or-No";
                // Clear unit and target when switching to Yes-or-No
                updates.unit = undefined;
                updates.target = undefined;
            }
            break;

        case "update_frequency":
            await ctx.reply("🗓️ How often do you want to track this habit?", {
                reply_markup: new InlineKeyboard()
                    .text("📅 Every day", "everyday")
                    .text("🧭 Custom", "custom"),
            });

            const freqRes = await conversation.waitFor("callback_query:data");
            await freqRes.answerCallbackQuery();
            const frequency = freqRes.callbackQuery.data;

            if (frequency === "custom") {
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
                        updates.days = selectedDays;
                        updates.frequency = "custom";
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
            } else {
                updates.frequency = "daily";
                updates.days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            }
            break;

        case "update_target":
            await ctx.reply(`What's your new <b>target</b> for ${selectedHabit.name}?`, {
                parse_mode: "HTML",
            });

            while (true) {
                const targetRes = await conversation.waitFor("message:text");
                const input = targetRes.message.text.trim();
                const parsed = Number(input);

                if (!isNaN(parsed) && parsed > 0) {
                    updates.target = parsed;
                    await ctx.reply(`Got it! Your new goal is ${parsed} ${selectedHabit.unit} per session.`);
                    break;
                } else {
                    await targetRes.reply("⚠️ Please enter a valid number (e.g. 10, 25, 100).");
                }
            }
            break;

        case "update_unit":
            await ctx.reply("What's the new <b>unit</b> for this habit? (e.g. pages, minutes, pushups)", {
                parse_mode: "HTML",
            });
            const unitRes = await conversation.waitFor("message:text");
            updates.unit = unitRes.message.text.trim();
            break;

        case "update_reminder":
            await ctx.reply(
                `At what time would you like me to remind you about <b>${selectedHabit.name}?</b>`,
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
                        .resized()
                }
            );

            let reminderTime: string | undefined;
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
                    reminderTime = customRes.message.text.trim();
                    const normalized = reminderTime.replace(/[^\d:APMapm ]/g, "").trim();

                    if (!timePattern.test(normalized)) {
                        await customRes.reply(
                            "⚠️ That doesn't look like a valid time. Please try again (e.g., 7:00 AM)."
                        );
                        continue;
                    }

                    reminderTime = normalized;
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
                reminderTime = normalized;
            }

            updates.reminderTime = reminderTime;
            await ctx.reply(`Perfect! I'll remind you at <b>${reminderTime}</b>.`, {
                parse_mode: "HTML",
                reply_markup: { remove_keyboard: true },
            });
            break;
    }

    // Update the habit in database
    await conversation.external(async () => {
        const habit = await Habit.findById(habitId);
        if (!habit) {
            throw new Error("Habit not found");
        }

        // Apply updates
        Object.assign(habit, updates);
        await habit.save();

        // If reminder time was updated, reschedule reminder
        if (updates.reminderTime) {
            const user = await User.findById(habit.userId);
            if (user) {
                // Cancel old reminder
                cancelReminder(habitId);
                // Schedule new reminder
                await scheduleReminder(habit, user.telegramId);
            }
        }
    });

    await delay(500, 1000);

    // Build confirmation message
    let confirmMessage = `✅ <b>${selectedHabit.name}</b> has been updated!\n`;
    if (updates.name) confirmMessage = `✅ Habit renamed to <b>${updates.name}</b>!`;

    if (updates.type) confirmMessage += `\n🏷️ Type: ${updates.type}`;
    if (updates.target) confirmMessage += `\n🎯 Target: ${updates.target}`;
    if (updates.unit) confirmMessage += `\n📏 Unit: ${updates.unit}`;
    if (updates.frequency) confirmMessage += `\n🗓️ Frequency: ${updates.frequency === "daily" ? "Every day" : "Custom"}`;
    if (updates.days) confirmMessage += `\n📆 Days: ${updates.days.join(", ")}`;
    if (updates.reminderTime) confirmMessage += `\n⏰ Reminder: ${updates.reminderTime}`;

    await ctx.reply(confirmMessage, {
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true },
    });
}

export default updateHabit;
