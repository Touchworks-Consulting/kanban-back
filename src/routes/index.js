const express = require('express');
const authRoutes = require('./authRoutes');
const leadRoutes = require('./leadRoutes');
const kanbanRoutes = require('./kanbanRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const webhookRoutes = require('./webhookRoutes');
const cronJobRoutes = require('./cronJobRoutes');
const automationRoutes = require('./automationRoutes');

const router = express.Router();

// API Version
router.get('/', (req, res) => {
  res.json({
    message: 'Leads CRM API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      leads: '/api/leads',
      kanban: '/api/kanban',
      dashboard: '/api/dashboard',
      webhooks: '/api/webhooks',
      cronJobs: '/api/cron-jobs',
      automations: '/api/automations'
    },
    documentation: '/api/docs'
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/kanban', kanbanRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/cron-jobs', cronJobRoutes);
router.use('/automations', automationRoutes);

module.exports = router;
