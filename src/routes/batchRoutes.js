const express = require('express');
const batchController = require('../controllers/batchController');
const { authenticateToken } = require('../middleware/auth');
const { getMetrics } = require('../middleware/requestMonitoring');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * GET /api/batch/static-data
 * Carrega todos os dados estáticos necessários (users, custom statuses, loss reasons)
 * em uma única requisição
 */
router.get('/static-data', batchController.loadStaticData);

/**
 * GET /api/batch/dashboard-data
 * Carrega dados do dashboard com cache otimizado
 */
router.get('/dashboard-data', batchController.loadDashboardData);

/**
 * POST /api/batch/clear-cache
 * Limpa todo o cache da conta (útil para desenvolvimento)
 */
router.post('/clear-cache', batchController.clearCache);

/**
 * GET /api/batch/metrics
 * Retorna métricas de performance e rate limiting
 */
router.get('/metrics', getMetrics);

module.exports = router;