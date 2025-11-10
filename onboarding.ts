import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Context, Bot, Keyboard } from "grammy";
import { MyContext } from './bot';
import { delay } from "./utils/helpers";

// helper to dynamically render selected days
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

export function registerOnboarding(bot: Bot<MyContext>) {
    const startCommand = async (conversation: Conversation<MyContext>, ctx: Context) => {
        const name = await askForName(conversation, ctx);
        const purpose = await askForMainPurpose(conversation, ctx);
        const email = await askForEmail(conversation, ctx);
        const { emailOption } = email;
        const habit = await askForHabit(conversation, ctx, emailOption);
        await delay(1000, 1500);
        await ctx.reply("🎉 You're all set! Welcome aboard ProDOS 🚀", {
            reply_markup: { remove_keyboard: true },
        });
    };

    bot.use(createConversation(startCommand));

    const inlineKeyboard = new InlineKeyboard()
        .text("Let's begin ✨", "onboard_user");

    bot.command("start", async (ctx) =>
        await ctx.reply(
            "👋 Hi, I’m ProDOS — your calm space for focus, discipline, and habit-building. \n\nTogether, we’ll create small, consistent routines that shape who you become. \n\nShall we begin?",
            { reply_markup: inlineKeyboard }
        )
    );

    bot.callbackQuery("onboard_user", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter("startCommand");
    });
}

// ---------------------------
// modular functions
// ---------------------------

async function askForName(conversation: Conversation<MyContext>, ctx: Context) {
    const { first_name, last_name } = ctx.from!;
    await ctx.reply(`Great! \n\nI see your name is ${first_name} ${last_name}, should I keep it as that?`, {
        reply_markup: new InlineKeyboard()
            .text("✅ Yes", "keep_name")
            .text("✏️ Change", "edit_name"),
    });

    const action = await conversation.waitFor("callback_query:data");
    await action.answerCallbackQuery();

    if (action.callbackQuery.data === "edit_name") {
        await ctx.reply("Okay, what name should I use?");
        const msg = await conversation.waitFor("message:text");
        await ctx.reply("Your name has been successfully updated!");
        await delay(600, 1000);
        return msg.message.text;
    }

    return `${first_name} ${last_name}`;
}

async function askForMainPurpose(conversation: Conversation<MyContext>, ctx: Context) {
    await ctx.reply(
        "Nice! \n\nEveryone joins ProDOS with a different purpose. \nWhat would you say best describes yours?",
        {
            reply_markup: new InlineKeyboard()
                .text("Build consistency 🧱")
                .text("Stay focused 🎯")
                .row()
                .text("Track progress 📊")
                .text("All of the above 💪"),
        }
    );

    const optionChosen = await conversation.waitFor("callback_query:data");
    await optionChosen.answerCallbackQuery();
    return optionChosen.callbackQuery.data;
}

async function askForEmail(conversation: Conversation<MyContext>, ctx: Context) {
    await ctx.reply(
        "Nice choice \n\nWould you like to link an email? \nThis helps me sync your progress to web when that feature launches (optional).",
        {
            reply_markup: new InlineKeyboard().text("Add email ✉️").text("Skip ⏭️"),
        }
    );

    const emailQuery = await conversation.waitFor("callback_query:data");
    const emailOption = emailQuery.callbackQuery.data;
    await emailQuery.answerCallbackQuery();

    if (emailOption === "Add email ✉️") {
        await ctx.reply("What's your email address?");
        const { message } = await conversation.waitFor("message:text");
        await ctx.reply("Your email has been saved successfully!");
        await delay(800, 1300);
        return { emailOption, email: message.text };
    }

    return { emailOption, email: null };
}

async function askForHabit(conversation: Conversation<MyContext>, ctx: Context, emailOption: string) {
    await ctx.reply(
        `${emailOption === "Add email ✉️" ? "Now...\n" : "Alright. "}Let’s begin with one small habit you’d like to start building. \n\n<b>What new habit would you like to create?</b>\n\n(Something simple — like Reading or Journaling. Other details will follow shortly)`,
        {
            parse_mode: "HTML",
        }
    );

    const habitRes = await conversation.waitFor("message:text");

    const habitName = habitRes.message?.text || "Unnamed habit";

    await ctx.reply(
        `Perfect 🌱 \nYou’ve created your first habit: <b><i>${habitName}</i></b>. \n\nNow, I’ll ask you a few questions to set it up properly.`,
        { parse_mode: "HTML" }
    );

    await delay(800, 1500);

    // Step 1️⃣ Ask type of habit
    await ctx.reply(
        "What kind of habit is this?\n\nIs this a <code>measurable</code> or <code>yes-or-no</code> habit?",
        {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
                .text("📈 Measurable", "measurable")
                .text("✅ Yes-or-no", "yesno"),
        }
    );

    const habitTypeRes = await conversation.waitFor("callback_query:data");
    const habitType = habitTypeRes.callbackQuery.data;
    await habitTypeRes.answerCallbackQuery();

    let unit: string | null = null;
    let target: number | null = null;

    if (habitType === "measurable") {
        await ctx.reply("Nice! What’s the <b>unit</b> for this habit? (e.g. pages, minutes, pushups)", {
            parse_mode: "HTML",
        });
        const unitRes = await conversation.waitFor("message:text");
        unit = unitRes.message.text;

        await ctx.reply(`Cool. And what’s your <b>target</b> for each session?`, {
            parse_mode: "HTML",
        });

        while (true) {
            const targetRes = await conversation.waitFor("message:text");
            const input = targetRes.message.text.trim();

            // Check if it's a valid number
            const parsed = Number(input);
            if (!isNaN(parsed) && parsed > 0) {
                target = parsed;
                await ctx.reply(`Got it! Your goal is ${target} ${unit} per session.`);
                break; // exit loop once valid number is entered
            } else {
                await targetRes.reply("⚠️ Please enter a valid number (e.g. 10, 25, 100).");
            }
        }

        await delay(700, 1200);
    }

    await ctx.reply("🗓️ How often do you want to track this habit?", {
        reply_markup: new InlineKeyboard().text("📅 Every day", "everyday").text("🧭 Custom", "custom"),
    });

    const freqRes = await conversation.waitFor("callback_query:data");
    const frequency = freqRes.callbackQuery.data;
    await freqRes.answerCallbackQuery();

    let days: string[] = [];
    if (frequency === "custom") {
        let selectedDays: string[] = [];
        let message = await freqRes.reply(
            "📆 Select the days you want to track this habit (tap to toggle) 👇\n\nClick ✅Done when you're done",
            { reply_markup: getDaysKeyboard(selectedDays) }
        );

        while (true) {
            const dayRes = await conversation.waitFor("callback_query:data");
            const data = dayRes.callbackQuery.data;

            if (data === "done") {
                await dayRes.answerCallbackQuery({ text: "Days saved!" });
                days = selectedDays;
                // check if selected days is not empty before exiting the loop
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
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }

    await ctx.reply(
        `At what time of the day would you like me to remind you about <b>${habitName}?</b>`,
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

    // --- time selection (fixed) ---
    let reminderTime: string | undefined;

    // first read (this is the message from the custom keyboard or user's typed time)
    const timeRes = await conversation.waitFor("message:text");
    const chosenTime = timeRes.message.text.trim();
    console.log("[time][first] ", chosenTime); // trace of first input

    if (chosenTime === "⏰ Custom Time") {
        // user chose custom — stay in a dedicated loop until a valid time is given
        await timeRes.reply(
            "Please type your preferred reminder time in 12-hour format (e.g., 7:00 AM, 9:30 PM):",
            { reply_markup: { remove_keyboard: true } }
        );

        const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

        while (true) {
            const customRes = await conversation.waitFor("message:text");
            reminderTime = customRes.message.text.trim();
            console.log("[time][custom input] ", reminderTime); // trace each custom attempt

            // normalize (remove emojis / extra chars) before validating
            const normalized = reminderTime.replace(/[^\d:APMapm ]/g, "").trim();

            if (!timePattern.test(normalized)) {
                await customRes.reply(
                    "⚠️ That doesn’t look like a valid time. Please try again (e.g., 7:00 AM)."
                );
                continue; // stay in this loop until valid
            }

            // valid -> use normalized form
            reminderTime = normalized;
            console.log("[time][valid] ", reminderTime);
            break;
        }
    } else {
        // user picked one of the keyboard presets (or typed a time directly)
        let normalized = chosenTime.replace(/[^\d:APMapm ]/g, "").trim();
        const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

        // Keep logging untill valid time is entered
        while (!timePattern.test(normalized)) {
            await ctx.reply("⚠️ That doesn’t look like a valid time. Please try again (e.g., 7:00 AM)."
            )

            const newTimeRes = await conversation.waitFor('message:text')
            normalized = newTimeRes.message.text.replace(/[^\d:APMapm ]/g, "").trim()
        }
        // Once valid...
        reminderTime = normalized
    }

    // final confirmation (runs only after a valid reminderTime is set)
    await ctx.reply(`Perfect! I’ll remind you at <b>${reminderTime}</b>.`, {
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true },
    });


    await delay(1000, 1500);

    const habitData = {
        name: habitName,
        type: habitType === "yesno" ? "Yes-or-No" : "Measurable",
        unit,
        target,
        frequency,
        days,
        reminderTime,
    };

    await ctx.reply("✅ Your habit has been fully set up!", { reply_markup: { remove_keyboard: true } });
    console.log("HABIT DATA:", habitData);

    return habitData;
}
