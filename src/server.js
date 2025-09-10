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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100, // limit each IP to 100 requests per windowMs
  message: 'Muitas requisições. Tente novamente em 15 minutos.'
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
app.use('/api/', limiter);

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

    // Sync database models
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados com o banco');
    }

    // Inicializar serviços de automação
    await CronJobService.initialize();
    
    // Processar automações agendadas a cada minuto
    setInterval(async () => {
      await AutomationService.processScheduledAutomations();
    }, 60000); // 1 minuto

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
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
