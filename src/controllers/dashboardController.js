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

  // Novo endpoint: Métricas de tempo por estágio
  getStageTimingMetrics: asyncHandler(async (req, res) => {
    console.log(`📊 getStageTimingMetrics: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;

    const stageMetrics = await DashboardService.getStageTimingMetrics(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ stageMetrics });
  }),

  // Novo endpoint: Taxa de conversão entre estágios
  getStageConversionRates: asyncHandler(async (req, res) => {
    console.log(`📊 getStageConversionRates: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;

    const conversionRates = await DashboardService.getStageConversionRates(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ conversionRates });
  }),

  // Novo endpoint: Leads estagnados
  getStagnantLeads: asyncHandler(async (req, res) => {
    console.log(`📊 getStagnantLeads: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { days_threshold = 7 } = req.query;
    const daysThreshold = parseInt(days_threshold, 10);

    if (isNaN(daysThreshold) || daysThreshold < 1) {
      return res.status(400).json({
        error: 'days_threshold deve ser um número positivo'
      });
    }

    const stagnantLeads = await DashboardService.getStagnantLeads(req.account.id, daysThreshold);

    res.json({
      stagnantLeads,
      threshold: daysThreshold
    });
  }),

  // Novo endpoint: Métricas detalhadas combinadas
  getDetailedStageMetrics: asyncHandler(async (req, res) => {
    console.log(`📊 getDetailedStageMetrics: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;

    const detailedMetrics = await DashboardService.getDetailedStageMetrics(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ detailedMetrics });
  }),

  // ===============================
  // NOVOS ENDPOINTS: RANKING DE VENDEDORES
  // ===============================

  // Dados completos da tabela de ranking
  getSalesRanking: asyncHandler(async (req, res) => {
    console.log(`📊 getSalesRanking: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;

    const salesRanking = await DashboardService.getSalesRankingData(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ salesRanking });
  }),

  // Dados para gráfico de barras de performance
  getSalesPerformanceChart: asyncHandler(async (req, res) => {
    console.log(`📊 getSalesPerformanceChart: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;

    const chartData = await DashboardService.getSalesPerformanceChart(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ chartData });
  }),

  // Dados para gráfico de dispersão (atividades vs conversão)
  getActivityConversionScatter: asyncHandler(async (req, res) => {
    console.log(`📊 getActivityConversionScatter: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const { start_date, end_date } = req.query;

    const scatterData = await DashboardService.getActivityVsConversionData(req.account.id, {
      startDate: start_date,
      endDate: end_date
    });

    res.json({ scatterData });
  }),

  // ===============================

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
