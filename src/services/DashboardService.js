const { Lead, KanbanColumn, Tag } = require('../models');
const { Op } = require('sequelize');

class DashboardService {
  static async getMetrics(accountId, dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);
    
    const whereClause = {
      account_id: accountId,
      ...(startDate && endDate && {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      })
    };

    // Total leads
    const totalLeads = await Lead.count({ where: whereClause });

    // Leads by status
    const leadsByStatus = await Lead.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Leads by platform
    const leadsByPlatform = await Lead.findAll({
      where: whereClause,
      attributes: [
        'platform',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['platform'],
      raw: true
    });

    // Conversion metrics
    const wonLeads = await Lead.count({
      where: { ...whereClause, status: 'won' }
    });
    
    const lostLeads = await Lead.count({
      where: { ...whereClause, status: 'lost' }
    });

    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads * 100).toFixed(2) : 0;

    // Total value
    const totalValue = await Lead.sum('value', {
      where: { ...whereClause, status: 'won' }
    }) || 0;

    // Recent leads (last 7 days for trend)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentLeads = await Lead.count({
      where: {
        account_id: accountId,
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    return {
      totalLeads,
      recentLeads,
      wonLeads,
      lostLeads,
      conversionRate: parseFloat(conversionRate),
      totalValue: parseFloat(totalValue),
      leadsByStatus: leadsByStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count)
      })),
      leadsByPlatform: leadsByPlatform.map(item => ({
        platform: item.platform || 'unknown',
        count: parseInt(item.count)
      }))
    };
  }

  static async getConversionFunnel(accountId, dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);
    
    const whereClause = {
      account_id: accountId,
      ...(startDate && endDate && {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      })
    };

    const funnelSteps = [
      'new',
      'contacted', 
      'qualified',
      'proposal',
      'won'
    ];

    const funnel = [];
    
    for (const status of funnelSteps) {
      const count = await Lead.count({
        where: { ...whereClause, status }
      });
      
      funnel.push({
        step: status,
        count,
        percentage: 0 // Will be calculated after getting all counts
      });
    }

    // Calculate percentages based on the first step
    const totalLeads = funnel[0].count;
    funnel.forEach(step => {
      step.percentage = totalLeads > 0 ? ((step.count / totalLeads) * 100).toFixed(2) : 0;
      step.percentage = parseFloat(step.percentage);
    });

    return funnel;
  }

  static async getLeadsByTimeframe(accountId, timeframe = 'week') {
    const data = [];
    const now = new Date();
    let periods = 7;
    let unit = 'day';

    switch (timeframe) {
      case 'month':
        periods = 30;
        unit = 'day';
        break;
      case 'year':
        periods = 12;
        unit = 'month';
        break;
      default: // week
        periods = 7;
        unit = 'day';
    }

    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date(now);
      
      if (unit === 'day') {
        date.setDate(date.getDate() - i);
      } else {
        date.setMonth(date.getMonth() - i);
      }

      const startOfPeriod = new Date(date);
      const endOfPeriod = new Date(date);

      if (unit === 'day') {
        startOfPeriod.setHours(0, 0, 0, 0);
        endOfPeriod.setHours(23, 59, 59, 999);
      } else {
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);
        endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);
        endOfPeriod.setDate(0);
        endOfPeriod.setHours(23, 59, 59, 999);
      }

      const count = await Lead.count({
        where: {
          account_id: accountId,
          created_at: {
            [Op.between]: [startOfPeriod, endOfPeriod]
          }
        }
      });

      data.push({
        date: unit === 'day' ? date.toISOString().split('T')[0] : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        count
      });
    }

    return data;
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
}

module.exports = DashboardService;
