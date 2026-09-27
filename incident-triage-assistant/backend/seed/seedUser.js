/**
 * Run with: npm run seed
 * Creates a demo user so you can log in immediately:
 *   email: admin@triage.com
 *   password: admin123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: 'admin@triage.com' });
  if (existing) {
    console.log('Demo user already exists: admin@triage.com');
  } else {
    await User.create({
      name: 'Admin User',
      email: 'admin@triage.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Demo user created -> email: admin@triage.com | password: admin123');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
