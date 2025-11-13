import { Habit, IHabit } from "../models/Habit";
import { Types } from "mongoose";

export interface CreateHabitInput {
    userId: string | Types.ObjectId;
    name: string;
    description?: string;
    frequency?: "daily" | "custom";
}

export async function createHabit(
    input: CreateHabitInput
): Promise<IHabit> {
    if (!input.name || !input.name.trim()) {
        throw new Error("Habit name is required");
    }

    const newHabit = new Habit({
        userId: input.userId,
        name: input.name.trim(),
        description: input.description?.trim(),
        frequency: input.frequency || "daily",
    });

    await newHabit.save();
    return newHabit;
}

export async function getHabitsByUser(
    userId: string | Types.ObjectId
): Promise<IHabit[]> {
    return Habit.find({ userId }).sort({ createdAt: -1 });
}

export async function deleteHabit(habitId: string | Types.ObjectId): Promise<void> {
    await Habit.findByIdAndDelete(habitId);
}
