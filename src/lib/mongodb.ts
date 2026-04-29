import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var tristarMongoose:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined. Set it in your .env / .env.local file.");
}

const cached = global.tristarMongoose ?? { conn: null, promise: null };
global.tristarMongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
