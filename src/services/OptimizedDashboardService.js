const { Lead, KanbanColumn, Tag, Campaign } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

// Cache simples em memória (em produção usar Redis)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

class OptimizedDashboardService {
  
  // Função para cache com TTL
  static setCacheItem(key, value) {
    cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  static getCacheItem(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  static getCacheKey(accountId, method, params = {}) {
    return `${accountId}_${method}_${JSON.stringify(params)}`;
  }

  // Query otimizada para KPIs principais
  static async getOptimizedKPIs(accountId, dateRange = {}) {
    const cacheKey = this.getCacheKey(accountId, 'kpis', dateRange);
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getDateRange(dateRange);
    
    // Query única que retorna todos os KPIs de uma vez
    const query = `
      WITH date_filtered_leads AS (
        SELECT 
          id, status, campaign, platform, value, created_at, won_at, lost_at
        FROM "Lead"
        WHERE account_id = :accountId
        ${startDate && endDate ? 'AND created_at BETWEEN :startDate AND :endDate' : ''}
      ),
      kpi_calculations AS (
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'won' THEN 1 END) as won_leads,
          COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
          COALESCE(SUM(CASE WHEN status = 'won' THEN COALESCE(value, 0) END), 0) as total_value,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_leads,
          AVG(CASE 
            WHEN status = 'won' AND won_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (won_at - created_at))/86400 
          END) as avg_conversion_days
        FROM date_filtered_leads
      ),
      status_breakdown AS (
        SELECT 
          status,
          COUNT(*) as count
        FROM date_filtered_leads
        GROUP BY status
      ),
      platform_breakdown AS (
        SELECT 
          COALESCE(platform, 'unknown') as platform,
          COUNT(*) as count
        FROM date_filtered_leads
        GROUP BY platform
      )
      SELECT 
        k.*,
        CASE 
          WHEN k.total_leads > 0 THEN (k.won_leads::float / k.total_leads * 100)
          ELSE 0 
        END as conversion_rate
      FROM kpi_calculations k;
    `;

    const [kpiResult] = await sequelize.query(query, {
      replacements: { accountId, startDate, endDate },
      type: QueryTypes.SELECT
    });

    // Queries separadas para breakdowns (mais eficiente que JOINs complexos)
    const [statusBreakdown, platformBreakdown] = await Promise.all([
      sequelize.query(`
        SELECT status, COUNT(*) as count
        FROM "Lead"
        WHERE account_id = :accountId
        ${startDate && endDate ? 'AND created_at BETWEEN :startDate AND :endDate' : ''}
        GROUP BY status
      `, {
        replacements: { accountId, startDate, endDate },
        type: QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COALESCE(platform, 'unknown') as platform, COUNT(*) as count
        FROM "Lead"
        WHERE account_id = :accountId
        ${startDate && endDate ? 'AND created_at BETWEEN :startDate AND :endDate' : ''}
        GROUP BY platform
      `, {
        replacements: { accountId, startDate, endDate },
        type: QueryTypes.SELECT
      })
    ]);

    const result = {
      totalLeads: parseInt(kpiResult?.total_leads || 0),
      recentLeads: parseInt(kpiResult?.recent_leads || 0),
      wonLeads: parseInt(kpiResult?.won_leads || 0),
      lostLeads: parseInt(kpiResult?.lost_leads || 0),
      conversionRate: parseFloat(kpiResult?.conversion_rate || 0),
      totalValue: parseFloat(kpiResult?.total_value || 0),
      avgConversionDays: parseFloat(kpiResult?.avg_conversion_days || 0),
      leadsByStatus: statusBreakdown.map(item => ({
        status: item.status,
        count: parseInt(item.count)
      })),
      leadsByPlatform: platformBreakdown.map(item => ({
        platform: item.platform,
        count: parseInt(item.count)
      }))
    };

    this.setCacheItem(cacheKey, result);
    return result;
  }

  // Query otimizada para timeline de leads
  static async getOptimizedTimeline(accountId, timeframe = 'week') {
    const cacheKey = this.getCacheKey(accountId, 'timeline', { timeframe });
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    let dateFormat, interval;
    let periods = 7;

    switch (timeframe) {
      case 'month':
        dateFormat = 'YYYY-MM-DD';
        interval = '30 days';
        periods = 30;
        break;
      case 'year':
        dateFormat = 'YYYY-MM';
        interval = '12 months';
        periods = 12;
        break;
      default: // week
        dateFormat = 'YYYY-MM-DD';
        interval = '7 days';
        periods = 7;
    }

    // Query otimizada usando generate_series do PostgreSQL
    const query = `
      WITH date_series AS (
        SELECT 
          DATE(generate_series(
            NOW() - INTERVAL '${interval}',
            NOW(),
            INTERVAL '1 ${timeframe === 'year' ? 'month' : 'day'}'
          )) as date
      ),
      leads_by_date AS (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as leads,
          COUNT(CASE WHEN status = 'won' THEN 1 END) as conversions
        FROM "Lead"
        WHERE account_id = :accountId
        AND created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE(created_at)
      )
      SELECT 
        TO_CHAR(ds.date, '${dateFormat}') as date,
        COALESCE(lbd.leads, 0) as leads,
        COALESCE(lbd.conversions, 0) as conversions
      FROM date_series ds
      LEFT JOIN leads_by_date lbd ON ds.date = lbd.date
      ORDER BY ds.date;
    `;

    const result = await sequelize.query(query, {
      replacements: { accountId },
      type: QueryTypes.SELECT
    });

    this.setCacheItem(cacheKey, result);
    return result;
  }

  // Funil otimizado com single query
  static async getOptimizedFunnel(accountId, dateRange = {}) {
    const cacheKey = this.getCacheKey(accountId, 'funnel', dateRange);
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getDateRange(dateRange);
    
    // Query que calcula o funil em uma única operação - corrigida para PostgreSQL
    const query = `
      SELECT 
        step, 
        count, 
        percentage,
        sort_order
      FROM (
        WITH funnel_data AS (
          SELECT 
            COUNT(CASE WHEN status IN ('new', 'contacted', 'qualified', 'proposal', 'won') THEN 1 END) as new_count,
            COUNT(CASE WHEN status IN ('contacted', 'qualified', 'proposal', 'won') THEN 1 END) as contacted_count,
            COUNT(CASE WHEN status IN ('qualified', 'proposal', 'won') THEN 1 END) as qualified_count,
            COUNT(CASE WHEN status IN ('proposal', 'won') THEN 1 END) as proposal_count,
            COUNT(CASE WHEN status = 'won' THEN 1 END) as won_count
          FROM "Lead"
          WHERE account_id = :accountId
          ${startDate && endDate ? 'AND created_at BETWEEN :startDate AND :endDate' : ''}
        )
        SELECT 
          'new' as step, new_count as count, 
          CASE WHEN new_count > 0 THEN 100.0 ELSE 0 END as percentage,
          1 as sort_order
        FROM funnel_data
        UNION ALL
        SELECT 
          'contacted' as step, contacted_count as count,
          CASE WHEN new_count > 0 THEN (contacted_count::float / new_count * 100) ELSE 0 END as percentage,
          2 as sort_order
        FROM funnel_data
        UNION ALL
        SELECT 
          'qualified' as step, qualified_count as count,
          CASE WHEN new_count > 0 THEN (qualified_count::float / new_count * 100) ELSE 0 END as percentage,
          3 as sort_order
        FROM funnel_data
        UNION ALL
        SELECT 
          'proposal' as step, proposal_count as count,
          CASE WHEN new_count > 0 THEN (proposal_count::float / new_count * 100) ELSE 0 END as percentage,
          4 as sort_order
        FROM funnel_data
        UNION ALL
        SELECT 
          'won' as step, won_count as count,
          CASE WHEN new_count > 0 THEN (won_count::float / new_count * 100) ELSE 0 END as percentage,
          5 as sort_order
        FROM funnel_data
      ) funnel_steps
      ORDER BY sort_order;
    `;

    const result = await sequelize.query(query, {
      replacements: { accountId, startDate, endDate },
      type: QueryTypes.SELECT
    });

    const funnel = result.map(row => ({
      step: row.step,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage).toFixed(2)
    }));

    this.setCacheItem(cacheKey, funnel);
    return funnel;
  }

  // Top campanhas com performance
  static async getTopCampaigns(accountId, dateRange = {}, limit = 5) {
    const cacheKey = this.getCacheKey(accountId, 'top_campaigns', { dateRange, limit });
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getDateRange(dateRange);
    
    const query = `
      SELECT 
        campaign,
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_leads,
        COALESCE(SUM(CASE WHEN status = 'won' THEN COALESCE(value, 0) END), 0) as total_value,
        CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status = 'won' THEN 1 END)::float / COUNT(*) * 100)
          ELSE 0 
        END as conversion_rate,
        AVG(CASE 
          WHEN status = 'won' AND won_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (won_at - created_at))/3600
        END) as avg_conversion_hours
      FROM "Lead"
      WHERE account_id = :accountId
      AND campaign IS NOT NULL
      ${startDate && endDate ? 'AND created_at BETWEEN :startDate AND :endDate' : ''}
      GROUP BY campaign
      HAVING COUNT(*) > 0
      ORDER BY conversion_rate DESC, total_leads DESC
      LIMIT :limit;
    `;

    const result = await sequelize.query(query, {
      replacements: { accountId, startDate, endDate, limit },
      type: QueryTypes.SELECT
    });

    const campaigns = result.map(row => ({
      campaign: row.campaign,
      totalLeads: parseInt(row.total_leads),
      wonLeads: parseInt(row.won_leads),
      totalValue: parseFloat(row.total_value),
      conversionRate: parseFloat(row.conversion_rate),
      avgConversionHours: row.avg_conversion_hours ? parseFloat(row.avg_conversion_hours) : null
    }));

    this.setCacheItem(cacheKey, campaigns);
    return campaigns;
  }

  // Dashboard completo otimizado
  static async getOptimizedDashboard(accountId, dateRange = {}, timeframe = 'week') {
    const cacheKey = this.getCacheKey(accountId, 'full_dashboard', { dateRange, timeframe });
    const cached = this.getCacheItem(cacheKey);
    if (cached) return cached;

    // Executar todas as queries em paralelo para máxima performance
    const [kpis, timeline, funnel, topCampaigns] = await Promise.all([
      this.getOptimizedKPIs(accountId, dateRange),
      this.getOptimizedTimeline(accountId, timeframe),
      this.getOptimizedFunnel(accountId, dateRange),
      this.getTopCampaigns(accountId, dateRange, 5)
    ]);

    const result = {
      kpis,
      timeline: {
        timeframe,
        data: timeline
      },
      funnel,
      topCampaigns,
      generatedAt: new Date().toISOString(),
      cacheStatus: 'generated'
    };

    this.setCacheItem(cacheKey, result);
    return result;
  }

  static getDateRange(dateRange) {
    const { startDate, endDate } = dateRange;
    
    if (startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    }

    return {};
  }

  // Limpar cache (útil para testes ou invalidação manual)
  static clearCache() {
    cache.clear();
  }

  // Estatísticas do cache
  static getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const [key, item] of cache.entries()) {
      if (now - item.timestamp > CACHE_DURATION) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: cache.size,
      valid,
      expired,
      hitRate: cache.size > 0 ? (valid / cache.size * 100).toFixed(2) + '%' : '0%'
    };
  }
}

module.exports = OptimizedDashboardService;