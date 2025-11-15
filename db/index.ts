import mongoose from "mongoose";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";

export interface SessionData {
  onboardingComplete?: boolean;
  tempHabitName?: string;
  userId?: string;
  tempUserData?: {
    name?: string;
    email?: string;
    purpose?: string;
  };
}

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database not initialized yet')
    }

    const collection = db.collection("conversations");
    return new MongoDBAdapter({ collection });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    throw err;
  }
}
