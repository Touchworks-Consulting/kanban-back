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
router.get('/conversion-time-by-campaign', dashboardController.getAverageConversionTimeByCampaign);

// Novos endpoints para análise de estágios
router.get('/stage-timing', dashboardController.getStageTimingMetrics);
router.get('/stage-conversion-rates', dashboardController.getStageConversionRates);
router.get('/stagnant-leads', dashboardController.getStagnantLeads);
router.get('/detailed-stage-metrics', dashboardController.getDetailedStageMetrics);

// Novos endpoints para ranking de vendedores
router.get('/sales-ranking', dashboardController.getSalesRanking);
router.get('/sales-performance-chart', dashboardController.getSalesPerformanceChart);
router.get('/activity-conversion-scatter', dashboardController.getActivityConversionScatter);

module.exports = router;
