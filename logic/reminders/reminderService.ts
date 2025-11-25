import cron from "node-cron";
import { Bot } from "grammy";
import { Habit, IHabit } from "../../db/models/Habit.js";
import { User } from "../../db/models/User.js";

const scheduledJobs = new Map<string, import("node-cron").ScheduledTask>();
let botInstance: Bot | null = null;
const reminderssentToday = new Map<string, string>();

// Initialize the reminder service with bot instance
export function initializeReminderService(bot: Bot) {
    botInstance = bot;

    loadExistingReminders().catch(error => {
        console.error("Failed to load existing reminders:", error);
    });

    console.log("✅ Reminder service initialized");
}

// Load all existing habits from database and schedule their reminders
async function loadExistingReminders(): Promise<void> {
    try {
        const habits = await Habit.find({
            reminderTime: { $exists: true, $ne: null },
        }).populate("userId");

        const schedulePromises = habits.map(async (habit) => {
            const user = await User.findById(habit.userId);
            if (user && habit.reminderTime) {
                await scheduleReminder(habit, user.telegramId);
                return true;
            }
            return false;
        });

        const results = await Promise.all(schedulePromises);
        const scheduledCount = results.filter(Boolean).length;

        console.log(`📅 Loaded and scheduled ${scheduledCount} existing reminders`);
    } catch (error) {
        console.error("Error loading existing reminders:", error);
    }
}

// Convert 12-hour time to cron format
function timeToCron(time: string, days: string[]): string {
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
    if (!timeMatch) {
        throw new Error(`Invalid time format: ${time}`);
    }

    const hourString = timeMatch[1];
    const minuteString = timeMatch[2];
    const periodString = timeMatch[3];

    if (hourString === undefined || minuteString === undefined || periodString === undefined) {
        throw new Error(`Invalid time format: ${time}`);
    }

    let hour = parseInt(hourString, 10);
    const minute = parseInt(minuteString, 10);
    const period = periodString.toUpperCase();

    if (period === "PM" && hour !== 12) {
        hour += 12;
    } else if (period === "AM" && hour === 12) {
        hour = 0;
    }

    const dayMap: { [key: string]: number } = {
        "Sun": 0,
        "Mon": 1,
        "Tue": 2,
        "Wed": 3,
        "Thu": 4,
        "Fri": 5,
        "Sat": 6,
    };

    if (days && days.length > 0) {
        const cronDays = days.map((day) => dayMap[day]).join(",");
        return `${minute} ${hour} * * ${cronDays}`;
    } else {
        return `${minute} ${hour} * * *`;
    }
}

// Schedule a reminder for a habit
export async function scheduleReminder(
    habit: IHabit,
    telegramId: number
): Promise<void> {
    if (!botInstance) {
        throw new Error("Reminder service not initialized. Call initializeReminderService first.");
    }

    if (!habit.reminderTime) {
        return;
    }

    cancelReminder(habit._id.toString());

    try {
        const cronExpression = timeToCron(habit.reminderTime, habit.days || []);

        const job = cron.schedule(
            cronExpression,
            async () => {
                if (!botInstance) return;

                console.log(`Reminder triggered for habit: ${habit.name}`);

                if (habit.lastLoggedAt) {
                    const lastLogged = new Date(habit.lastLoggedAt);
                    const today = new Date();
                    if (
                        lastLogged.getDate() === today.getDate() &&
                        lastLogged.getMonth() === today.getMonth() &&
                        lastLogged.getFullYear() === today.getFullYear()
                    ) {
                        console.log(`Skipping reminder - already logged today`);
                        return;
                    }
                }

                console.log(`Sending reminder for habit: ${habit.name} to ${(await habit.populate('userId')).name}`);
                await sendReminderNotification(habit, telegramId);
            },
            {
                timezone: "Africa/Lagos",
            }
        );

        scheduledJobs.set(habit._id.toString(), job);
    } catch (error) {
        console.error(`Error scheduling reminder for habit ${habit.name}:`, error);
        throw error;
    }
}

// Cancel a scheduled reminder
export function cancelReminder(habitId: string): void {
    const job = scheduledJobs.get(habitId);
    if (job) {
        job.stop();
        scheduledJobs.delete(habitId);
        console.log(`❌ Cancelled reminder for habit: ${habitId}`);
    }
}

// Update reminder schedule
export async function updateReminder(
    habitId: string,
    newTime?: string,
    newDays?: string[]
): Promise<void> {
    const habit = await Habit.findById(habitId);
    if (!habit) {
        throw new Error("Habit not found");
    }

    const user = await User.findById(habit.userId);
    if (!user) {
        throw new Error("User not found");
    }

    if (newTime) {
        habit.reminderTime = newTime;
    }
    if (newDays) {
        habit.days = newDays;
    }
    await habit.save();

    await scheduleReminder(habit, user.telegramId);
}

// Send reminder notification
async function sendReminderNotification(habit: IHabit, telegramId: number): Promise<void> {
    if (process.env.NODE_ENV === 'development' && telegramId !== 2118957209) {
        console.log(`Skipping reminder for habit ${habit._id} in development mode for ${telegramId}.`);
        return;
    }

    if (!botInstance) return;

    const habitId = habit._id.toString();
    const today = new Date().toISOString().split('T')[0] ?? "";
    const lastSentDate = reminderssentToday.get(habitId);

    if (lastSentDate === today) {
        return;
    }

    reminderssentToday.set(habitId, today);

    const message = `🔔 <b>Reminder: ${habit.name}</b>\n\nTime to log your habit!`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "✅ Log Habit", callback_data: `log_habit_${habit._id}` },
                { text: "⏭️ Skip", callback_data: `skip_reminder_${habit._id}` },
            ],
        ],
    };

    try {
        await botInstance.api.sendMessage(telegramId, message, {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
    } catch (error) {
        console.error(`Error sending reminder to ${telegramId}:`, error);
    }
}
