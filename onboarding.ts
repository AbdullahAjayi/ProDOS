import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard } from "grammy";
import { Bot } from "grammy";
import { MySessionContext } from './bot.js';
import { delay } from "./utils/helpers.js";
import createHabit from "./logic/habit/createHabit.js";
import { createUserFromSession } from "./db/helpers/userHelper.js";

export function registerOnboarding(bot: Bot<MySessionContext>) {
    const onboarding = async (conversation: Conversation<MySessionContext, MySessionContext>, ctx: MySessionContext) => {

        const name = await askForName(conversation, ctx);
        const purpose = await askForMainPurpose(conversation, ctx);
        const email = await askForEmail(conversation, ctx);
        const { emailAddress } = email;

        // Save user to database first
        try {
            await conversation.external(async () => {
                const tempUserData = {
                    name,
                    email: emailAddress,
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
            const habit = await createHabit(conversation, ctx, true);
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
        console.log(`New user added successfully: ${ctx.from?.username}`)
    };

    bot.use(createConversation(onboarding, "onboarding"));

    const inlineKeyboard = new InlineKeyboard()
        .text("Let's begin ✨", "onboard_user");

    bot.command(["start", "onboarding"], async (ctx) => {
        console.log('Someone started the bot')
        await ctx.reply(
            "👋 Hi, I’m ProDOS — your calm space for focus, discipline, and habit-building. \n\nTogether, we’ll create small, consistent routines that shape who you become. \n\nShall we begin?",
            { reply_markup: inlineKeyboard }
        )
    }
    );

    bot.callbackQuery("onboard_user", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.enter('onboarding');
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
        "Nice choice \n\nKindly provide me your email? \nThis helps me sync your progress to web when that feature launches.\n\n Ensure you type it correctly (e.g ibrahimsalako@gmail.com)",
    );

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let emailAddress = "";
    let isValid = false;

    while (!isValid) {
        const { message } = await conversation.waitFor("message:text");
        emailAddress = message.text.trim();

        if (emailRegex.test(emailAddress)) {
            isValid = true;
            await ctx.reply("✅ Nice. Your email has been saved successfully!");
            await delay(800, 1300);
        } else {
            await ctx.reply("❌ That doesn't look like a valid email. Please try again (e.g., ibrahimsalako@gmail.com):");
        }
    }

    return { emailAddress };
}
