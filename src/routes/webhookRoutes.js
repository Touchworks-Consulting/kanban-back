const express = require('express');
const webhookController = require('../controllers/webhookController');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Webhooks usam autenticação por API key
router.use(authenticateApiKey);

// Receber lead
router.post('/lead', webhookController.receiveLead);

// Teste do webhook
router.get('/test', webhookController.test);
router.post('/test', webhookController.test);

module.exports = router;
