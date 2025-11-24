import { User, IUser } from "../models/User.js";
import { Context } from "grammy";

/**
 * Get user data from MongoDB by telegramId
 */
export async function getUserData(ctx: Context): Promise<IUser | null> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        return null;
    }
    return await User.findOne({ telegramId });
}

/**
 * Get user ID from MongoDB by telegramId
 */
export async function getUserId(ctx: Context): Promise<string | null> {
    const user = await getUserData(ctx);
    return user ? (user._id as any).toString() : null;
}

/**
 * Check if user has completed onboarding
 * For now, we consider onboarding complete if user exists
 * (In the future, you can add an onboardingComplete field to User model)
 */
export async function isOnboardingComplete(ctx: Context): Promise<boolean> {
    const user = await getUserData(ctx);
    return user !== null;
}

