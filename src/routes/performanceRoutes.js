const express = require('express');
const performanceController = require('../controllers/performanceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Métricas de performance
router.get('/mql-percentage', performanceController.getMQLPercentage);
router.get('/loss-reasons', performanceController.getLossReasons);
router.get('/status-distribution', performanceController.getStatusDistribution);

module.exports = router;
