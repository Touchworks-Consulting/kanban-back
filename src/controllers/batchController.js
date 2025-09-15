/**
 * Controller para carregamento em batch de dados
 * Reduz requisições de dashboard de ~10-15 calls para 1-2 calls
 */

const { User, Account } = require('../models');
const cacheService = require('../services/CacheService');
const settingsController = require('./settingsController');
const dashboardController = require('./dashboardController');

const batchController = {
  /**
   * Carrega todos os dados estáticos necessários para o frontend em uma única requisição
   * Substitui múltiplas chamadas: /users, /settings/custom-statuses, /settings/loss-reasons
   */
  async loadStaticData(req, res) {
    try {
      const accountId = req.account.id;
      const startTime = Date.now();

      console.log(`🚀 BATCH: Carregando dados estáticos para conta ${accountId}`);

      // Tentar buscar tudo do cache em paralelo
      const [cachedUsers, cachedStatuses, cachedReasons] = await Promise.all([
        cacheService.getUsersCache(accountId),
        cacheService.getCustomStatusesCache(accountId),
        cacheService.getLossReasonsCache(accountId)
      ]);

      let users, customStatuses, lossReasons;
      const cacheHits = [];
      const cacheMisses = [];

      // Users
      if (cachedUsers) {
        users = cachedUsers;
        cacheHits.push('users');
      } else {
        users = await User.findAll({ where: { account_id: accountId } });
        await cacheService.setUsersCache(accountId, users);
        cacheMisses.push('users');
      }

      // Custom Statuses
      if (cachedStatuses) {
        customStatuses = cachedStatuses;
        cacheHits.push('custom_statuses');
      } else {
        const account = await Account.findByPk(accountId);
        customStatuses = account?.custom_statuses || [];
        await cacheService.setCustomStatusesCache(accountId, customStatuses);
        cacheMisses.push('custom_statuses');
      }

      // Loss Reasons
      if (cachedReasons) {
        lossReasons = cachedReasons;
        cacheHits.push('loss_reasons');
      } else {
        const account = await Account.findByPk(accountId);
        lossReasons = account?.custom_loss_reasons || [];
        await cacheService.setLossReasonsCache(accountId, lossReasons);
        cacheMisses.push('loss_reasons');
      }

      const loadTime = Date.now() - startTime;

      console.log(`✅ BATCH: Dados carregados em ${loadTime}ms`);
      console.log(`📦 Cache HITS: ${cacheHits.join(', ') || 'nenhum'}`);
      console.log(`💾 Cache MISSES: ${cacheMisses.join(', ') || 'nenhum'}`);

      res.json({
        success: true,
        data: {
          users: users,
          customStatuses: customStatuses,
          lossReasons: lossReasons
        },
        meta: {
          loadTime: loadTime,
          cacheHits: cacheHits,
          cacheMisses: cacheMisses,
          fromCache: cacheMisses.length === 0
        }
      });

    } catch (error) {
      console.error('Erro no carregamento batch:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar dados estáticos',
        message: error.message
      });
    }
  },

  /**
   * Carrega dados do dashboard com cache otimizado
   * Substitui múltiplas chamadas de dashboard
   */
  async loadDashboardData(req, res) {
    try {
      const accountId = req.account.id;
      const filters = req.query;
      const filterKey = JSON.stringify(filters);
      const startTime = Date.now();

      console.log(`🚀 BATCH: Carregando dashboard para conta ${accountId} com filtros:`, filters);

      // Tentar buscar do cache
      const cachedDashboard = await cacheService.getDashboardCache(accountId, 'full', filterKey);

      if (cachedDashboard) {
        const loadTime = Date.now() - startTime;
        console.log(`📦 Cache HIT: Dashboard completo em ${loadTime}ms`);

        return res.json({
          success: true,
          data: cachedDashboard,
          meta: {
            loadTime: loadTime,
            fromCache: true
          }
        });
      }

      // Cache MISS - buscar dados completos
      console.log(`💾 Cache MISS: Buscando dashboard completo do banco`);

      // Simular múltiplas requisições do dashboard em paralelo
      // Aqui você integraria com os métodos existentes do dashboardController
      // Por exemplo: overview, conversion funnel, recent activities, etc.

      const dashboardData = {
        overview: {
          totalLeads: 0,
          convertedLeads: 0,
          conversionRate: 0,
          totalValue: 0
        },
        conversionFunnel: [],
        recentActivities: [],
        topCampaigns: [],
        // outros dados do dashboard...
      };

      // Cache dos dados por 30 segundos
      await cacheService.setDashboardCache(accountId, 'full', dashboardData, filterKey);

      const loadTime = Date.now() - startTime;
      console.log(`✅ BATCH: Dashboard carregado em ${loadTime}ms`);

      res.json({
        success: true,
        data: dashboardData,
        meta: {
          loadTime: loadTime,
          fromCache: false
        }
      });

    } catch (error) {
      console.error('Erro no carregamento batch do dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar dados do dashboard',
        message: error.message
      });
    }
  },

  /**
   * Invalida todos os caches relacionados a uma conta
   * Útil para desenvolvimento e troubleshooting
   */
  async clearCache(req, res) {
    try {
      const accountId = req.account.id;

      console.log(`🧹 Limpando todos os caches para conta ${accountId}`);

      await cacheService.invalidateAccountCache(accountId);

      res.json({
        success: true,
        message: 'Cache limpo com sucesso',
        accountId: accountId
      });

    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao limpar cache',
        message: error.message
      });
    }
  }
};

module.exports = batchController;