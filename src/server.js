require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./database/connection');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const CronJobService = require('./services/CronJobService');
const AutomationService = require('./services/AutomationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting (separa auth crítico de demais rotas)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições. Tente novamente em alguns minutos.'
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // evita loops de refresh
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
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Aplica limiter geral apenas a rotas de negócio, não nas rotas de auth basicas para diferenciar
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return apiLimiter(req, res, next);
});

// Limiter específico para refresh/logout/login/register
app.use('/api/auth/:action(refresh|logout|login|register)', authLimiter);

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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Local: http://localhost:${PORT}/health`);
      console.log(`📊 WSL: http://172.23.223.142:${PORT}/health`);
      console.log(`🔌 API: http://localhost:${PORT}/api`);
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
