const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const memoryDb = require('./database/memory-db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Buscar conta no banco de memória
    const account = memoryDb.findAccount({ id: decoded.id });
    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    req.account = account;
    next();
  });
};

// Controllers
const authController = require('./controllers/simpleAuthController');
const kanbanController = require('./controllers/simpleKanbanController');
const whatsappAccountController = require('./controllers/whatsappAccountController')(memoryDb.campaigns);
const webhookController = require('./controllers/webhookController');
const leadController = require('./controllers/simpleLeadController');
const campaignController = require('./controllers/campaignController');

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Auth routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/verify', authenticateToken, authController.verify);

// Kanban routes
app.get('/api/kanban/board', authenticateToken, kanbanController.getBoard);
app.get('/api/kanban/columns', authenticateToken, kanbanController.listColumns);
app.post('/api/kanban/columns', authenticateToken, kanbanController.createColumn);
app.put('/api/kanban/columns/:id', authenticateToken, kanbanController.updateColumn);
app.delete('/api/kanban/columns/:id', authenticateToken, kanbanController.deleteColumn);
app.patch('/api/kanban/columns/reorder', authenticateToken, kanbanController.reorderColumns);

// Lead routes
app.get('/api/leads', authenticateToken, leadController.list);
app.get('/api/leads/:id', authenticateToken, leadController.getById);
app.post('/api/leads', authenticateToken, leadController.create);
app.put('/api/leads/:id', authenticateToken, leadController.update);
app.delete('/api/leads/:id', authenticateToken, leadController.delete);
app.patch('/api/leads/:id/move', authenticateToken, leadController.move);

// Campaign routes
app.get('/api/campaigns', authenticateToken, campaignController.listCampaigns);
app.get('/api/campaigns/:id', authenticateToken, campaignController.getCampaign);
app.post('/api/campaigns', authenticateToken, campaignController.createCampaign);
app.put('/api/campaigns/:id', authenticateToken, campaignController.updateCampaign);
app.delete('/api/campaigns/:id', authenticateToken, campaignController.deleteCampaign);

// Trigger phrase routes
app.get('/api/campaigns/:campaignId/phrases', authenticateToken, campaignController.listTriggerPhrases);
app.post('/api/campaigns/:campaignId/phrases', authenticateToken, campaignController.createTriggerPhrase);
app.put('/api/phrases/:phraseId', authenticateToken, campaignController.updateTriggerPhrase);
app.delete('/api/phrases/:phraseId', authenticateToken, campaignController.deleteTriggerPhrase);

// Test phrase matching
app.post('/api/campaigns/test-match', authenticateToken, campaignController.testPhraseMatch);

// Webhook routes (sem autenticação para permitir webhooks externos)
app.get('/api/webhook/whatsapp', webhookController.verifyWebhook);
app.post('/api/webhook/whatsapp', webhookController.whatsappWebhook);

// WhatsApp Accounts routes
app.get('/api/whatsapp-accounts', authenticateToken, whatsappAccountController.getAccounts);
app.get('/api/whatsapp-accounts/:id', authenticateToken, whatsappAccountController.getAccount);
app.post('/api/whatsapp-accounts', authenticateToken, whatsappAccountController.createAccount);
app.put('/api/whatsapp-accounts/:id', authenticateToken, whatsappAccountController.updateAccount);
app.delete('/api/whatsapp-accounts/:id', authenticateToken, whatsappAccountController.deleteAccount);
app.post('/api/whatsapp-accounts/:id/test-webhook', authenticateToken, whatsappAccountController.testWebhook);
app.get('/api/whatsapp-accounts/:id/webhook-logs', authenticateToken, whatsappAccountController.getWebhookLogs);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`API disponível em http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Login de teste: admin@admin.com / admin123`);
});