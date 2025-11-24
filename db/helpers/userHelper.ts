import { User, IUser } from "../models/User.js";
import { SessionData } from "../index.js";
import { Context } from "grammy";

export async function createUserFromSession(
    ctx: Context,
    sessionData: SessionData
): Promise<IUser> {
    if (!sessionData.tempUserData) {
        throw new Error("Missing user data in session");
    }

    const { name, email, purpose } = sessionData.tempUserData;

    // if (!name || !email || !purpose) {
    //     throw new Error("Incomplete user data: name, email, and purpose are required");
    // }

    const telegramId = ctx.from?.id;
    if (!telegramId) {
        throw new Error("Unable to get Telegram user ID");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ telegramId });
    if (existingUser) {
        // Update existing user with new data
        existingUser.name = name!;
        existingUser.email = email!;
        existingUser.purpose = purpose!;
        await existingUser.save();
        return existingUser;
    }

    // Create new user
    const newUser = new User({
        telegramId,
        name,
        email,
        purpose,
    });

    await newUser.save();
    return newUser;
}
