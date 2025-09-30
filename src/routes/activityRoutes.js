const express = require('express');
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Lead-specific activity routes moved to leadRoutes.js

// Activity management routes
router.put('/:activityId', activityController.updateActivity);
router.delete('/:activityId', activityController.deleteActivity);

// User activity dashboard routes
router.get('/users/:userId/activities/today', activityController.getTodayActivities);
router.get('/users/:userId/activities/overdue', activityController.getOverdueActivities);
router.get('/users/:userId/activities/upcoming', activityController.getUpcomingActivities);
router.get('/users/:userId/activities/counts', activityController.getActivityCounts);

// Current user shortcuts (no userId needed)
router.get('/today', activityController.getTodayActivities);
router.get('/overdue', activityController.getOverdueActivities);
router.get('/upcoming', activityController.getUpcomingActivities);
router.get('/counts', activityController.getActivityCounts);

// Bulk operations
router.post('/bulk-update-status', activityController.bulkUpdateStatus);

// Lead activity counts moved to leadRoutes.js

// Administrative operations
router.post('/mark-overdue', activityController.markOverdueActivities);

module.exports = router;