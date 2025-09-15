const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const wa = require('../controllers/whatsappAccountController');

const router = express.Router();

router.get('/', authenticateToken, wa.list);
router.get('/:id', authenticateToken, wa.get);
router.post('/', authenticateToken, wa.create);
router.put('/:id', authenticateToken, wa.update);
router.delete('/:id', authenticateToken, wa.remove);
router.post('/:id/test-webhook', authenticateToken, wa.testWebhook);
router.get('/:id/webhook-logs', authenticateToken, wa.logs);

module.exports = router;
