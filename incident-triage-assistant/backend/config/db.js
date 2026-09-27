const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/incident_triage';
  const shouldUseMemoryFallback = !process.env.MONGO_URI || uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017');

  try {
    await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    if (shouldUseMemoryFallback) {
      try {
        const memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        await mongoose.connect(memoryUri);
        console.log('[DB] MongoDB connected via in-memory server');
        return;
      } catch (memoryErr) {
        console.error('[DB] Failed to start in-memory MongoDB:', memoryErr.message);
      }
    }

    console.error('[DB] MongoDB connection error:', err.message);
    console.error('[DB] Make sure MongoDB is running and MONGO_URI is correct in .env');
    process.exit(1);
  }
}

module.exports = connectDB;
