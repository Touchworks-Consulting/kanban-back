const OptimizedDashboardService = require('../services/OptimizedDashboardService');
const { asyncHandler } = require('../middleware/errorHandler');

const optimizedDashboardController = {
  // Dashboard completo otimizado
  getOptimizedDashboard: asyncHandler(async (req, res) => {
    const { start_date, end_date, timeframe = 'week' } = req.query;
    
    const dateRange = {
      startDate: start_date,
      endDate: end_date
    };

    const dashboard = await OptimizedDashboardService.getOptimizedDashboard(
      req.account.id, 
      dateRange, 
      timeframe
    );

    // Adicionar headers para controle de cache no cliente
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
    res.setHeader('ETag', `"${Date.now()}"`);

    res.json({
      success: true,
      dashboard: {
        ...dashboard,
        account: {
          id: req.account.id,
          name: req.account.name
        }
      }
    });
  }),

  // KPIs otimizados
  getOptimizedKPIs: asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;
    
    const kpis = await OptimizedDashboardService.getOptimizedKPIs(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.setHeader('Cache-Control', 'public, max-age=180'); // 3 minutos
    res.json({ success: true, kpis });
  }),

  // Timeline otimizada
  getOptimizedTimeline: asyncHandler(async (req, res) => {
    const { timeframe = 'week' } = req.query;
    
    const timeline = await OptimizedDashboardService.getOptimizedTimeline(
      req.account.id, 
      timeframe
    );

    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutos
    res.json({ 
      success: true, 
      timeline: {
        timeframe,
        data: timeline
      }
    });
  }),

  // Funil otimizado
  getOptimizedFunnel: asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;
    
    const funnel = await OptimizedDashboardService.getOptimizedFunnel(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, funnel });
  }),

  // Top campanhas
  getTopCampaigns: asyncHandler(async (req, res) => {
    const { start_date, end_date, limit = 5 } = req.query;
    
    const campaigns = await OptimizedDashboardService.getTopCampaigns(req.account.id, {
      startDate: start_date,
      endDate: end_date
    }, parseInt(limit));

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, campaigns });
  }),

  // Estatísticas do cache
  getCacheStats: asyncHandler(async (req, res) => {
    const stats = OptimizedDashboardService.getCacheStats();
    res.json({ success: true, cache: stats });
  }),

  // Limpar cache
  clearCache: asyncHandler(async (req, res) => {
    OptimizedDashboardService.clearCache();
    res.json({ 
      success: true, 
      message: 'Cache limpo com sucesso' 
    });
  }),

  // Health check do dashboard
  healthCheck: asyncHandler(async (req, res) => {
    const start = Date.now();
    
    try {
      // Teste rápido de conectividade
      await OptimizedDashboardService.getOptimizedKPIs(req.account.id, {});
      const responseTime = Date.now() - start;
      
      res.json({
        success: true,
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        cache: OptimizedDashboardService.getCacheStats(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const responseTime = Date.now() - start;
      
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        responseTime: `${responseTime}ms`,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
};

module.exports = optimizedDashboardController;