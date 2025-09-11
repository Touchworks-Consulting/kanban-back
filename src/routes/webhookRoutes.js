const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

// Webhook verification (GET)
router.get('/whatsapp', webhookController.verifyWebhook);

// WhatsApp webhook receiver (POST)
router.post('/whatsapp', webhookController.whatsappWebhook);

module.exports = router;
