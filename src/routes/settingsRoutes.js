const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all settings routes
router.use(authenticateToken);

// Profile Management
router.get('/profile', settingsController.getProfile);
router.put('/profile', settingsController.updateProfile);

// System Statistics
router.get('/statistics', settingsController.getSystemStatistics);

// Data Export
router.get('/export/leads', settingsController.exportLeads);
router.get('/export/campaigns', settingsController.exportCampaigns);
router.get('/export/webhook-logs', settingsController.exportWebhookLogs);

// Notification Settings
router.get('/notifications/settings', settingsController.getNotificationSettings);
router.put('/notifications/settings', settingsController.updateNotificationSettings);

// Notifications Management
router.get('/notifications', settingsController.getNotifications);
router.put('/notifications/:id/read', settingsController.markNotificationAsRead);
router.put('/notifications/:id/dismiss', settingsController.dismissNotification);

// Custom Status Management
router.get('/statuses', settingsController.getCustomStatuses);
router.put('/statuses', settingsController.updateCustomStatuses);
router.get('/loss-reasons', settingsController.getCustomLossReasons);
router.put('/loss-reasons', settingsController.updateCustomLossReasons);

// System Maintenance
router.post('/maintenance/cleanup-logs', settingsController.cleanupOldLogs);

module.exports = router;