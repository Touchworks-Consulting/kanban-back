const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Dashboard completo
router.get('/', dashboardController.getDashboard);

// Métricas específicas
router.get('/metrics', dashboardController.getMetrics);
router.get('/funnel', dashboardController.getConversionFunnel);
router.get('/timeline', dashboardController.getLeadsByTimeframe);

module.exports = router;
