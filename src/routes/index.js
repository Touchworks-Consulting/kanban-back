const express = require('express');
const authRoutes = require('./authRoutes');
const leadRoutes = require('./leadRoutes');
const kanbanRoutes = require('./kanbanRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const webhookRoutes = require('./webhookRoutes');
const cronJobRoutes = require('./cronJobRoutes');
const automationRoutes = require('./automationRoutes');
// Novas rotas
const campaignRoutes = require('./campaignRoutes');
const whatsappAccountRoutes = require('./whatsappAccountRoutes');
const userRoutes = require('./userRoutes');
const accountRoutes = require('./accountRoutes');

const router = express.Router();

// API Version
router.get('/', (req, res) => {
  res.json({
    message: 'Leads CRM API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      accounts: '/api/accounts',
      leads: '/api/leads',
      kanban: '/api/kanban',
      dashboard: '/api/dashboard',
      webhooks: '/api/webhooks',
      cronJobs: '/api/cron-jobs',
  automations: '/api/automations',
  campaigns: '/api/campaigns',
  whatsappAccounts: '/api/whatsapp-accounts',
  users: '/api/users'
    },
    documentation: '/api/docs'
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/leads', leadRoutes);
router.use('/kanban', kanbanRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/cron-jobs', cronJobRoutes);
router.use('/automations', automationRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/whatsapp-accounts', whatsappAccountRoutes);
router.use('/users', userRoutes);

module.exports = router;
