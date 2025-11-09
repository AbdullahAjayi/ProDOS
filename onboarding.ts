import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Context, Bot } from "grammy";
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
            reply_markup: new InlineKeyboard().text("Skip habit creation for now", "skip_habit"),
        }
    );

    const action = await conversation.waitFor(["callback_query:data", "message:text"]);
    if (action.update.callback_query?.data === "skip_habit") {
        await ctx.reply(
            `Alright! Your details have been saved! \nClick the menu button below to explore the possibilities of ProDOS. 🚀`
        );
        return;
    }

    const habitName = action.message?.text || "Unnamed habit";

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
    let target: string | null = null;

    if (habitType === "measurable") {
        await ctx.reply("Nice! What’s the <b>unit</b> for this habit? (e.g. pages, minutes, pushups)", {
            parse_mode: "HTML",
        });
        const unitRes = await conversation.waitFor("message:text");
        unit = unitRes.message.text;

        await ctx.reply(`Cool. And what’s your <b>target</b> for each session?`, {
            parse_mode: "HTML",
        });
        const targetRes = await conversation.waitFor("message:text");
        target = targetRes.message.text;

        await ctx.reply(`Got it! Your goal is ${target} ${unit} per session.`);
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
            "📆 Select the days you want to track this habit (tap to toggle):",
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
        `At what time of the day would you like me to remind you about <b>${habitName}</b>? (e.g., 7:00 AM, 9:30 PM)`,
        {
            parse_mode: "HTML"
            // add a Custom Keyboard here with predefined times
        }
    );

    const timeRes = await conversation.waitFor("message:text");
    const reminderTime = timeRes.message.text;

    await ctx.reply(
        `Perfect! I’ll remind you at <b>${reminderTime}</b> every ${frequency === "everyday" ? "day" : "selected days"
        }.`,
        { parse_mode: "HTML" }
    );

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

    await ctx.reply("✅ Your habit has been fully set up!");
    console.log("HABIT DATA:", habitData);

    return habitData;
}
