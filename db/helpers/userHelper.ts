import { User, IUser } from "../models/User";
import { SessionData } from "../index";
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

    const updatedUser = await User.findOneAndUpdate(
        { telegramId },
        { status: { active: true } },
        { returnDocument: "after" }
    );
    if (updatedUser) {
        return updatedUser;
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
