import mongoose from "mongoose";
import { session, type SessionFlavor, Bot } from "grammy";
import { MongoDBAdapter, ISession } from "@grammyjs/storage-mongodb";

// Define what your session data looks like
export interface SessionData {
  onboardingComplete?: boolean;
  tempHabitName?: string;
  // add more fields here
}

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ Connected to MongoDB");

    // Create MongoDB collection for sessions
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database not initialized yet')
    }

    const collection = db.collection<ISession>("sessions");
    return new MongoDBAdapter({ collection });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    throw err;
  }
}
