import mongoose, { Schema, Document, Types } from "mongoose";

export interface IHabit extends Document {
    userId: Types.ObjectId;
    name: string;
    description?: string;
    frequency: "daily" | "custom";
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
    },
    { timestamps: true }
);

export const Habit = mongoose.model<IHabit>("Habit", HabitSchema);
