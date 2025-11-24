import { Habit, IHabit } from "../models/Habit.js";
import { Types } from "mongoose";

export interface CreateHabitInput {
    userId: string | Types.ObjectId;
    name: string;
    description?: string;
    frequency?: "daily" | "custom";
    reminderTime?: string;
    days?: string[];
    type?: "Yes-or-No" | "Measurable";
    unit?: string;
    target?: number;
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
        reminderTime: input.reminderTime,
        days: input.days,
        type: input.type,
        unit: input.unit,
        target: input.target,
        streak: 0,
        totalCompletions: 0,
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

export async function getHabitById(habitId: string | Types.ObjectId): Promise<IHabit | null> {
    return Habit.findById(habitId);
}
