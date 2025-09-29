const express = require('express');
const authRoutes = require('./authRoutes');
const leadRoutes = require('./leadRoutes');
const leadModalRoutes = require('./leadModalRoutes');
const kanbanRoutes = require('./kanbanRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const optimizedDashboardRoutes = require('./optimizedDashboardRoutes');
const webhookRoutes = require('./webhookRoutes');
const cronJobRoutes = require('./cronJobRoutes');
const automationRoutes = require('./automationRoutes');
// Novas rotas
const campaignRoutes = require('./campaignRoutes');
const whatsappAccountRoutes = require('./whatsappAccountRoutes');
const userRoutes = require('./userRoutes');
const accountRoutes = require('./accountRoutes');
const settingsRoutes = require('./settingsRoutes');
const batchRoutes = require('./batchRoutes');
const notificationRoutes = require('./notificationRoutes');
const billingRoutes = require('./billingRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const activityRoutes = require('./activityRoutes');

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
      leadModal: '/api/lead-modal',
      kanban: '/api/kanban',
      dashboard: '/api/dashboard',
      webhooks: '/api/webhooks',
      cronJobs: '/api/cron-jobs',
      automations: '/api/automations',
      campaigns: '/api/campaigns',
      whatsappAccounts: '/api/whatsapp-accounts',
      users: '/api/users',
      settings: '/api/settings',
      batch: '/api/batch',
      activities: '/api/activities',
      // notifications: '/api/notifications', // Desabilitado
      billing: '/api/billing',
      feedback: '/api/feedback'
    },
    documentation: '/api/docs'
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/leads', leadRoutes);
router.use('/lead-modal', leadModalRoutes);
router.use('/kanban', kanbanRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/dashboard', optimizedDashboardRoutes); // Rotas otimizadas
router.use('/webhooks', webhookRoutes);
router.use('/cron-jobs', cronJobRoutes);
router.use('/automations', automationRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/whatsapp-accounts', whatsappAccountRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/batch', batchRoutes);
router.use('/activities', activityRoutes);
// router.use('/notifications', notificationRoutes); // Desabilitado - requer Socket.IO
router.use('/billing', billingRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;
