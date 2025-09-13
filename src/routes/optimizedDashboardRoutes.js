const express = require('express');
const optimizedDashboardController = require('../controllers/optimizedDashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Dashboard otimizado completo
router.get('/optimized', optimizedDashboardController.getOptimizedDashboard);

// Endpoints específicos otimizados
router.get('/optimized/kpis', optimizedDashboardController.getOptimizedKPIs);
router.get('/optimized/timeline', optimizedDashboardController.getOptimizedTimeline);
router.get('/optimized/funnel', optimizedDashboardController.getOptimizedFunnel);
router.get('/optimized/top-campaigns', optimizedDashboardController.getTopCampaigns);

// Utilitários
router.get('/optimized/cache-stats', optimizedDashboardController.getCacheStats);
router.post('/optimized/clear-cache', optimizedDashboardController.clearCache);
router.get('/optimized/health', optimizedDashboardController.healthCheck);

module.exports = router;