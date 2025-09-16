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
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Tenant-ID']
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

// Debug endpoint to check environment and database
app.get('/api/debug', async (req, res) => {
  try {
    const debug = {
      environment: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      pgInstalled: false,
      connectionTest: 'not tested'
    };

    // Test pg package
    try {
      require('pg');
      debug.pgInstalled = true;
    } catch (e) {
      debug.pgInstalled = false;
      debug.pgError = e.message;
    }

    // Test database connection
    if (process.env.DATABASE_URL) {
      try {
        const { getSequelizeConnection, closeConnection } = require('../src/utils/serverless-db');
        const sequelize = await getSequelizeConnection();
        await sequelize.authenticate();
        debug.connectionTest = 'success';
        await closeConnection();
      } catch (e) {
        debug.connectionTest = 'failed';
        debug.connectionError = e.message;
      }
    }

    res.json(debug);
  } catch (error) {
    res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
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
    // Import database utilities
    const { getSequelizeConnection } = require('../src/utils/serverless-db');

    // Test database connection
    const sequelize = await getSequelizeConnection();
    console.log('Database connected successfully');

    // Mock Socket.IO para compatibilidade (não funciona em Vercel serverless)
    app.set('io', null);

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