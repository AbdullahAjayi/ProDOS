import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    telegramId: number;
    name: string;
    email: string;
    purpose: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        telegramId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            // required: true,
            lowercase: true,
        },
        purpose: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
