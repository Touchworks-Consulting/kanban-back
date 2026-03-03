const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// CORS headers globais - SEMPRE enviar, mesmo em caso de erro
// Isso garante que erros 503 ou outros não causem erros CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Permitir origem específica ou refletir a origem de volta
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Tenant-ID, x-api-key, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400'); // 24 horas

  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: false // Desabilitar X-Frame-Options para permitir iframes
}));

// Middleware manual para CORS nas rotas de embed - ANTES de qualquer outro CORS
app.use('/api/embed', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Tenant-ID, x-api-key');
  res.header('Access-Control-Max-Age', '86400'); // 24 horas
  
  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// CORS específico para rotas de embed - permite qualquer origem
app.use('/api/embed', cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Tenant-ID', 'x-api-key']
}));

// CORS geral - permite todas as origens refletindo de volta
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Tenant-ID', 'x-api-key', 'Cache-Control', 'Pragma']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (validates database connection)
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'unknown',
    routes: routesLoaded ? 'loaded' : 'loading',
    uptime: process.uptime()
  };

  try {
    // Tentar conectar ao banco se rotas foram carregadas
    if (routesLoaded) {
      const { getSequelizeConnection } = require('../src/utils/serverless-db');
      const sequelize = await getSequelizeConnection();
      await sequelize.authenticate();
      healthCheck.database = 'connected';
      healthCheck.status = 'ok';
      return res.status(200).json(healthCheck);
    } else if (routesLoadError) {
      healthCheck.status = 'error';
      healthCheck.database = 'error';
      healthCheck.error = process.env.NODE_ENV === 'production'
        ? 'Service initialization failed'
        : routesLoadError.message;
      return res.status(503).json(healthCheck);
    } else {
      healthCheck.status = 'initializing';
      healthCheck.database = 'pending';
      return res.status(503).json(healthCheck);
    }
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.database = 'disconnected';
    healthCheck.error = process.env.NODE_ENV === 'production'
      ? 'Database connection failed'
      : error.message;
    return res.status(503).json(healthCheck);
  }
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

// Variável para rastrear inicialização
let routesLoaded = false;
let routesLoadError = null;
let initPromise = null;

// Função de inicialização
async function initializeApp() {
  if (routesLoaded) return;
  if (routesLoadError) throw routesLoadError;

  // Se já está inicializando, retorna a promise existente
  if (initPromise) return initPromise;

  const startTime = Date.now();
  console.log('🔄 Starting route initialization...');

  initPromise = (async () => {
    try {
      // Import database utilities
      const { getSequelizeConnection } = require('../src/utils/serverless-db');

      // Test database connection
      console.log('📊 Connecting to database...');
      const sequelize = await getSequelizeConnection();
      console.log('✅ Database connected successfully');

      // Mock Socket.IO para compatibilidade (não funciona em Vercel serverless)
      app.set('io', null);

      // Import routes
      console.log('📦 Loading routes...');
      const routes = require('../src/routes');
      app.use('/api', routes);

      // Import error handlers
      const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
      app.use(notFoundHandler);
      app.use(errorHandler);

      routesLoaded = true;
      const loadTime = Date.now() - startTime;
      console.log(`✅ Routes loaded successfully in ${loadTime}ms`);
    } catch (error) {
      routesLoadError = error;
      console.error('❌ Error loading routes:', error);
      throw error;
    }
  })();

  return initPromise;
}

// Middleware que garante inicialização antes de processar requisições
app.use('/api', async (req, res, next) => {
  // Pular health check e debug para não causar loop
  if (req.path === '/health' || req.path === '/debug') {
    return next();
  }

  try {
    await initializeApp();
    next();
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      message: 'The service is initializing. Please try again in a moment.',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Fallback error handler
app.use((error, req, res, next) => {
  console.error('Fallback error handler:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

module.exports = app;