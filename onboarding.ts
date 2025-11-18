import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard } from "grammy";
import { Bot } from "grammy";
import { MySessionContext } from './bot';
import { delay } from "./utils/helpers";
import createHabit from "./logic/habit/createHabit";
import { createUserFromSession } from "./db/helpers/userHelper";

export function registerOnboarding(bot: Bot<MySessionContext>) {
    const startCommand = async (conversation: Conversation<MySessionContext, MySessionContext>, ctx: MySessionContext) => {

        const name = await askForName(conversation, ctx);
        const purpose = await askForMainPurpose(conversation, ctx);
        const email = await askForEmail(conversation, ctx);
        const { emailOption } = email;

        // Save user to database first
        try {
            await conversation.external(async () => {
                const tempUserData = {
                    name,
                    email: email.email || "",
                    purpose,
                };

                await createUserFromSession(ctx, { tempUserData });
            });
        } catch (err) {
            console.error("Error saving user:", err);
            await ctx.reply("❌ There was an error saving your profile. Please try again.", {
                reply_markup: { remove_keyboard: true },
            });
            return;
        }

        // Then save user habit
        try {
            const habit = await createHabit(conversation, ctx, emailOption);
        } catch (err) {
            console.error("Error creating habit:", err);
            await ctx.reply("❌ There was an error creating your habit. Please try again.", {
                reply_markup: { remove_keyboard: true },
            });
            return;
        }

        await delay(1000, 1500);
        await ctx.reply("<b>🎉 You're all set! Welcome aboard ProDOS 🚀</b>", {
            reply_markup: { remove_keyboard: true }, parse_mode: "HTML",
        });
    };

    bot.use(createConversation(startCommand, "startCommand"));

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
        await ctx.conversation.enter('startCommand');
    });
}

// ---------------------------
// modular functions
// ---------------------------

async function askForName(conversation: Conversation<MySessionContext, MySessionContext>, ctx: MySessionContext) {
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

async function askForMainPurpose(conversation: Conversation<MySessionContext, MySessionContext>, ctx: MySessionContext) {
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

async function askForEmail(conversation: Conversation<MySessionContext, MySessionContext>, ctx: MySessionContext) {
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
