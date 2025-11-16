import mongoose, { Schema, Document, Types } from "mongoose";

export interface IHabit extends Document {
    userId: Types.ObjectId;
    name: string;
    description?: string;
    frequency: "daily" | "custom";
    reminderTime?: string; // Time in 12-hour format (e.g., "9:00 PM")
    days?: string[]; // Array of days (e.g., ["Mon", "Tue", "Wed"])
    type?: "Yes-or-No" | "Measurable"; // Habit type
    unit?: string; // Unit for measurable habits
    target?: number; // Target value for measurable habits
    lastLoggedAt?: Date; // Track when habit was last logged
    streak?: number; // Current streak count
    totalCompletions?: number; // Total times completed
    createdAt: Date;
    updatedAt: Date;
}

const HabitSchema = new Schema<IHabit>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: undefined,
        },
        frequency: {
            type: String,
            enum: ["daily", "custom"],
            default: "daily",
        },
        reminderTime: {
            type: String,
            default: undefined,
        },
        days: {
            type: [String],
            default: undefined,
        },
        type: {
            type: String,
            enum: ["Yes-or-No", "Measurable"],
            default: undefined,
        },
        unit: {
            type: String,
            default: undefined,
        },
        target: {
            type: Number,
            default: undefined,
        },
        lastLoggedAt: {
            type: Date,
            default: undefined,
        },
        streak: {
            type: Number,
            default: 0,
        },
        totalCompletions: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export const Habit = mongoose.model<IHabit>("Habit", HabitSchema);
