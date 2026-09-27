require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const bugRoutes = require('./routes/bugRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

async function ensureDemoUser() {
  const existing = await User.findOne({ email: 'admin@triage.com' });
  if (!existing) {
    await User.create({
      name: 'Admin User',
      email: 'admin@triage.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Demo user created -> email: admin@triage.com | password: admin123');
  } else {
    console.log('Demo user already exists: admin@triage.com');
  }
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// --- Middleware ---
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Incident Triage API is running' });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await ensureDemoUser();
  app.listen(PORT, () => {
    console.log(`[Server] Incident Triage API running on http://localhost:${PORT}`);
  });
});

module.exports = app;
