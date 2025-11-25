import cron from "node-cron";
import { Bot } from "grammy";
import { Habit, IHabit } from "../../db/models/Habit.js";
import { User } from "../../db/models/User.js";

// Store scheduled cron jobs by habitId
const scheduledJobs = new Map<string, import("node-cron").ScheduledTask>();

let botInstance: Bot | null = null;

// Track which habits had reminders sent today (habitId -> date string YYYY-MM-DD)
const reminderssentToday = new Map<string, string>();


/**
 * Initialize the reminder service with bot instance
 */
export function initializeReminderService(bot: Bot) {
    botInstance = bot;

    // Load reminders in the background (non-blocking)
    loadExistingReminders().catch(error => {
        console.error("Failed to load existing reminders:", error);
    });

    console.log("✅ Reminder service initialized");
}

/**
 * Load all existing habits from database and schedule their reminders
 */
async function loadExistingReminders(): Promise<void> {
    try {
        const habits = await Habit.find({
            reminderTime: { $exists: true, $ne: null },
        }).populate("userId");

        // Schedule all habits in parallel for better performance
        const schedulePromises = habits.map(async (habit) => {
            const user = await User.findById(habit.userId);
            if (user && habit.reminderTime) {
                await scheduleReminder(habit, user.telegramId);
                return true; // Successfully scheduled
            }
            return false; // Not scheduled
        });

        const results = await Promise.all(schedulePromises);
        const scheduledCount = results.filter(Boolean).length;

        console.log(`📅 Loaded and scheduled ${scheduledCount} existing reminders`);
    } catch (error) {
        console.error("Error loading existing reminders:", error);
    }
}

/**
 * Convert 12-hour time (e.g., "9:00 PM") to cron format
 */
function timeToCron(time: string, days: string[]): string {
    // Parse time like "9:00 PM" or "6:00 AM"
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

    // Convert to 24-hour format
    if (period === "PM" && hour !== 12) {
        hour += 12;
    } else if (period === "AM" && hour === 12) {
        hour = 0;
    }

    // Map days to cron day format (0 = Sunday, 1 = Monday, etc.)
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
        // Custom days - create cron expression for specific days
        const cronDays = days.map((day) => dayMap[day]).join(",");
        return `${minute} ${hour} * * ${cronDays}`;
    } else {
        // Daily - every day
        return `${minute} ${hour} * * *`;
    }
}

/**
 * Check if reminder should be sent today
 */
function shouldSendReminderToday(habit: IHabit): boolean {
    if (!habit.days || habit.days.length === 0) {
        return true; // Daily habit
    }

    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayName = dayNames[today.getDay()];

    return habit.days.includes(todayName!);
}

/**
 * Schedule a reminder for a habit
 */
export async function scheduleReminder(
    habit: IHabit,
    telegramId: number
): Promise<void> {
    if (!botInstance) {
        throw new Error("Reminder service not initialized. Call initializeReminderService first.");
    }

    if (!habit.reminderTime) {
        return; // No reminder time set
    }

    // Cancel existing reminder if any
    cancelReminder(habit._id.toString());

    try {
        const cronExpression = timeToCron(habit.reminderTime, habit.days || []);

        const job = cron.schedule(
            cronExpression,
            async () => {
                if (!botInstance) return;

                console.log(`Reminder triggered for habit: ${habit.name}`);

                // Check if habit was already logged today
                if (habit.lastLoggedAt) {
                    const lastLogged = new Date(habit.lastLoggedAt);
                    const today = new Date();
                    if (
                        lastLogged.getDate() === today.getDate() &&
                        lastLogged.getMonth() === today.getMonth() &&
                        lastLogged.getFullYear() === today.getFullYear()
                    ) {
                        console.log(`Skipping reminder - already logged today`);
                        return; // Already logged today
                    }
                }

                // Send reminder
                console.log(`Sending reminder for habit: ${habit.name} to ${(await habit.populate('userId')).name}`);
                await sendReminderNotification(habit, telegramId);
            },
            {
                timezone: "Africa/Lagos", // TODO: Support user timezones
            }
        );

        scheduledJobs.set(habit._id.toString(), job);
    } catch (error) {
        console.error(`Error scheduling reminder for habit ${habit.name}:`, error);
        throw error;
    }
}

/**
 * Cancel a scheduled reminder
 */
export function cancelReminder(habitId: string): void {
    const job = scheduledJobs.get(habitId);
    if (job) {
        job.stop();
        scheduledJobs.delete(habitId);
        console.log(`❌ Cancelled reminder for habit: ${habitId}`);
    }
}

/**
 * Update reminder schedule
 */
export async function updateReminder(
    habitId: string,
    newTime?: string,
    newDays?: string[]
): Promise<void> {
    // Get habit from database
    const habit = await Habit.findById(habitId);
    if (!habit) {
        throw new Error("Habit not found");
    }

    // Get user associated with the habit to retrieve their telegramId
    const user = await User.findById(habit.userId);
    if (!user) {
        throw new Error("User not found");
    }

    // Update habit
    if (newTime) {
        habit.reminderTime = newTime;
    }
    if (newDays) {
        habit.days = newDays;
    }
    await habit.save();

    // Reschedule reminder
    await scheduleReminder(habit, user.telegramId);
}

/**
 * Send reminder notification
 */
async function sendReminderNotification(habit: IHabit, telegramId: number): Promise<void> {
    if (process.env.NODE_ENV === 'development' && telegramId !== 2118957209) {
        console.log(`Skipping reminder for habit ${habit._id} in development mode for ${telegramId}.`);
        return;
    }

    if (!botInstance) return;

    const habitId = habit._id.toString();
    const today = new Date().toISOString().split('T')[0] ?? ""; // Get date as YYYY-MM-DD
    const lastSentDate = reminderssentToday.get(habitId);

    // Skip if reminder was already sent today
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
