require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const { sequelize } = require('./database/connection');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const CronJobService = require('./services/CronJobService');
const AutomationService = require('./services/AutomationService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com']
      : ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

// Rate limiting (separa auth crítico de demais rotas)
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos (mais curto)
  max: Number(process.env.API_RATE_LIMIT) || 500, // Mais permissivo para app usage
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições. Tente novamente em alguns minutos.'
});

// Rate limiter específico para dashboard (mais permissivo)
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // Dobrar para múltiplas requisições simultâneas
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições ao dashboard. Aguarde um momento.'
});

// Rate limiter para rotas de app (accounts, users, kanban)
const appLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // Muito permissivo para uso normal do app
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições à aplicação. Aguarde um momento.'
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 50, // Permitir mais tentativas para fluxo normal
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + '|' + (req.headers['user-agent'] || ''),
  message: 'Limite de autenticação excedido. Aguarde um pouco.'
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // Configure your frontend domain
    : true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Tenant-ID']
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Aplicar rate limiters específicos ANTES das rotas
// Auth tem seu próprio limiter mais permissivo
app.use('/api/auth', authLimiter);

// Dashboard tem limiter mais permissivo para múltiplas requisições
app.use('/api/dashboard', dashboardLimiter);

// Rotas da aplicação (accounts, users, kanban) - mais permissivas
app.use('/api/accounts', appLimiter);
app.use('/api/users', appLimiter);
app.use('/api/kanban', appLimiter);
app.use('/api/leads', appLimiter);
app.use('/api/tags', appLimiter);
// Temporariamente sem rate limit para settings devido a loop no frontend
// app.use('/api/settings', appLimiter);

// Demais rotas da API (mais restritivas)
app.use('/api', (req, res, next) => {
  // Se já passou pelos limiters específicos acima, pula
  if (req.path.startsWith('/auth/') ||
      req.path.startsWith('/dashboard/') ||
      req.path.startsWith('/accounts/') ||
      req.path.startsWith('/users/') ||
      req.path.startsWith('/kanban/') ||
      req.path.startsWith('/leads/') ||
      req.path.startsWith('/tags/') ||
      req.path.startsWith('/settings/')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 Cliente conectado:', socket.id);

  socket.on('join-account', (accountId) => {
    socket.join(`account-${accountId}`);
    console.log(`👤 Cliente ${socket.id} entrou na sala account-${accountId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado:', socket.id);
  });
});

// Make io instance available globally
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida');

    // Database models already synced - skip sync in production
    console.log('✅ Usando modelos já sincronizados no PostgreSQL');

    // Inicializar serviços de automação
    await CronJobService.initialize();
    
    // Processar automações agendadas a cada minuto
    setInterval(async () => {
      await AutomationService.processScheduledAutomations();
    }, 60000); // 1 minuto

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Local: http://localhost:${PORT}/health`);
      console.log(`📊 WSL: http://172.23.223.142:${PORT}/health`);
      console.log(`🔌 API: http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO ativo na porta ${PORT}`);
      console.log(`⚡ Automações: Ativas`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Encerrando servidor...');
  CronJobService.stopAllJobs();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Encerrando servidor...');
  CronJobService.stopAllJobs();
  await sequelize.close();
  process.exit(0);
});

startServer();
