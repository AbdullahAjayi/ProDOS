import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Context, Bot } from "grammy";
import { MyContext } from './bot'
import { delay } from "./utils/helpers";


export function registerOnboarding(bot: Bot<MyContext>) {
    const startCommand = async (conversation: Conversation<MyContext>, ctx: Context) => {
        const { first_name, last_name } = ctx.from!

        await ctx.reply(`Great!\n\n I see your name is ${first_name} ${last_name}, should I keep it as that?`, {
            reply_markup: new InlineKeyboard()
                .text('✅ Yes', 'keep_name')
                .text('✏️ Change', 'edit_name')
        });

        const action = await conversation.waitFor('callback_query:data')

        if (action.callbackQuery.data === "edit_name") {
            await ctx.reply("Okay, what name should I use?");
            const msg = await conversation.waitFor("message:text");
            // update name
            await ctx.reply('Your name have been successfully updated!')

            await delay(600, 1000)
        }

        await ctx.reply('Nice! \n\nEveryone joins ProDOS with a different purpose. \nWhat would you say best describes yours?', {
            reply_markup: new InlineKeyboard()
                .text('Build consistency 🧱')
                .text('Stay focused 🎯').row()
                .text('Track progress 📊]')
                .text('All of the above 💪')
        })

        const optionChosen = await conversation.waitFor('callback_query:data')

        // do something with the chosen option

        await ctx.reply('Nice choice \n\nWould you like to link an email? \nThis helps me sync your progress to web when that feature launches (optional).', {
            reply_markup: new InlineKeyboard()
                .text('Add email ✉️')
                .text('Skip ⏭️')
        })

        const emailQuery = await conversation.waitFor('callback_query:data')

        const emailOption = emailQuery.callbackQuery.data

        if (emailOption === 'Add email ✉️') {
            // save email to DB
            await ctx.reply('What\'s your email address?')

            const { message } = await conversation.waitFor('message:text')

            await ctx.reply('Your email have been saved successfully!')
            await delay(800, 1300)
        }


        await ctx.reply(`${emailOption === 'Add email ✉️' ? 'Now...\n' : 'Alright. '}Let’s begin with one small habit you’d like to start building. \n What new habit would you like to create?\n\n(Something simple — like Reading 10 mins daily, or Journaling each morning.)`)

        const { message } = await conversation.waitFor('message:text')

        await ctx.reply(`Perfect 🌱 \nYou’ve created your first habit — ${message.text}. \n\nYou can manage all your habits from the buttons below 👇\n(or click the menu button for further actions)`)
    }

    bot.use(createConversation(startCommand))

    const inlineKeyboard = new InlineKeyboard()

    inlineKeyboard.text('Let\'s begin ✨', 'onboard_user')

    bot.command('start', async (ctx) => await ctx.reply(
        "👋 Hi, I’m ProDOS — your calm space for focus, discipline, and habit-building. \n\nTogether, we’ll create small, consistent routines that shape who you become. \n\nShall we begin?"
        , {
            reply_markup: inlineKeyboard
        }));

    // Define Callback functions
    bot.callbackQuery('onboard_user', async (ctx) => {
        await ctx.answerCallbackQuery()
        // await ctx.reply("Let's create your first habit. \n What is the name?")
        await ctx.conversation.enter("startCommand")
    })
    bot.callbackQuery('keep_name', async (ctx) => {
        await ctx.answerCallbackQuery()
        await ctx.reply("Awesome! Your name has been saved.")
    })
}

