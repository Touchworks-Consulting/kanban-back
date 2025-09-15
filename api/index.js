const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (simple)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Kanban CRM API is running', status: 'ok' });
});

// Import and use routes only after basic setup
let routesLoaded = false;

const loadRoutes = async () => {
  if (routesLoaded) return;

  try {
    // Import database connection
    const { sequelize } = require('../src/database/connection');

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Import routes
    const routes = require('../src/routes');
    app.use('/api', routes);

    // Import error handlers
    const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
    app.use(notFoundHandler);
    app.use(errorHandler);

    routesLoaded = true;
    console.log('Routes loaded successfully');
  } catch (error) {
    console.error('Error loading routes:', error);

    // Fallback error handler
    app.use((error, req, res, next) => {
      console.error('Fallback error handler:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
      });
    });
  }
};

// Load routes on first request
app.use(async (req, res, next) => {
  if (!routesLoaded && req.path !== '/api/health' && req.path !== '/') {
    try {
      await loadRoutes();
    } catch (error) {
      console.error('Error in middleware route loading:', error);
      return res.status(500).json({
        error: 'Service initialization error',
        message: 'Please try again in a moment'
      });
    }
  }
  next();
});

module.exports = app;