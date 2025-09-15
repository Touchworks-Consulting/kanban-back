require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import database connection
const { sequelize } = require('../src/database/connection');
const routes = require('../src/routes');
const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');

const app = express();

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.API_RATE_LIMIT) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições. Tente novamente em alguns minutos.'
});

// Security and middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://your-frontend-app.vercel.app']
    : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api', apiLimiter);

// Database connection initialization
let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) return;

  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    isConnected = true;
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
};

// Initialize database connection
connectDatabase().catch(console.error);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// For Vercel serverless functions, we need to export the app
module.exports = app;

// For local development, start the server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}