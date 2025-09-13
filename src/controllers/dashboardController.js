const DashboardService = require('../services/DashboardService');
const { asyncHandler } = require('../middleware/errorHandler');

const dashboardController = {
  // Métricas gerais
  getMetrics: asyncHandler(async (req, res) => {
    console.log(`📊 getMetrics: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;
    console.log(`📊 Buscando métricas para conta ${req.account.id} (${start_date} - ${end_date})`);

    const metrics = await DashboardService.getMetrics(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ metrics });
  }),

  // Funil de conversão
  getConversionFunnel: asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;
    
    const funnel = await DashboardService.getConversionFunnel(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ funnel });
  }),

  // Leads por período de tempo
  getLeadsByTimeframe: asyncHandler(async (req, res) => {
    const { timeframe = 'week' } = req.query;
    
    if (!['week', 'month', 'year'].includes(timeframe)) {
      return res.status(400).json({
        error: 'Timeframe deve ser: week, month ou year'
      });
    }

    const data = await DashboardService.getLeadsByTimeframe(req.account.id, timeframe);

    res.json({ 
      timeframe,
      data 
    });
  }),

  // Tempo médio até conversão por campanha
  getAverageConversionTimeByCampaign: asyncHandler(async (req, res) => {
    console.log(`📊 getAverageConversionTimeByCampaign: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;
    
    const conversionMetrics = await DashboardService.getAverageConversionTimeByCampaign(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ conversionMetrics });
  }),

  // Dashboard completo
  getDashboard: asyncHandler(async (req, res) => {
    const { start_date, end_date, timeframe = 'week' } = req.query;
    
    const dateRange = {
      startDate: start_date,
      endDate: end_date
    };

    const [metrics, funnel, timeline, conversionMetrics] = await Promise.all([
      DashboardService.getMetrics(req.account.id, dateRange),
      DashboardService.getConversionFunnel(req.account.id, dateRange),
      DashboardService.getLeadsByTimeframe(req.account.id, timeframe),
      DashboardService.getAverageConversionTimeByCampaign(req.account.id, dateRange)
    ]);

    res.json({
      dashboard: {
        metrics,
        funnel,
        timeline: {
          timeframe,
          data: timeline
        },
        conversionMetrics,
        account: {
          id: req.account.id,
          name: req.account.name
        }
      }
    });
  })
};

module.exports = dashboardController;
