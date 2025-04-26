
import mongoose, { Mongoose } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

declare global {
  var mongooseCache: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

async function dbConnect(): Promise<Mongoose> {
  console.log('Current connection state:', mongoose.connection.readyState);
  
  if (cached.conn && isConnected()) {
    console.log('DB Cache: Using cached connection');
    return cached.conn;
  }

  // Reset cache if connection is not valid
  cached.conn = null;
  cached.promise = null;

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  };

  try {
    console.log('DB Cache: Creating new connection');
    const mongooseInstance = await mongoose.connect(MONGODB_URI!, opts);

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected!');
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cached.conn = null;
      cached.promise = null;
    });

    cached.conn = mongooseInstance;
    console.log('MongoDB Connected Successfully!');
    return mongooseInstance;
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}

export async function closeConnection() {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}

export default dbConnect;
