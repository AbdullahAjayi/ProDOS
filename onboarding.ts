import { createConversation, type Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Context, Bot } from "grammy";
import { MyContext } from './bot.js'


export function registerOnboarding(bot: Bot<MyContext>) {
    const startCommand = async (conversation: Conversation, ctx: Context) => {
        await ctx.reply("Let's create your first habit \nWhat's the name");
        const { message } = await conversation.waitFor('message:text')
        await ctx.reply(`Nice, a new habit *${message.text}* have been created successfully`)
    }

    bot.use(createConversation(startCommand))

    const inlineKeyboard = new InlineKeyboard()

    inlineKeyboard.text('➕ Create Habit', 'create_habit').text('📋 My Habits', 'list_habits').text('ℹ️ Help', 'help')

    bot.command('start', async (ctx) => await ctx.reply(
        "🚀 Hi there, I am ProDOS. Your Productivity Partner on Telegram. \n\nThis chat is a calm space for you to build your habits, discipline, and focus. \n\nLet's begin!"
        , {
            reply_markup: inlineKeyboard
        }));

    bot.callbackQuery('create_habit', async (ctx) => {
        await ctx.answerCallbackQuery()
        // await ctx.reply("Let's create your first habit. \n What is the name?")
        await ctx.conversation.enter("startCommand")
    })
}

