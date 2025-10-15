const { Lead, KanbanColumn, Tag, LeadHistory, LeadActivity, User } = require('../models');
const { Op } = require('sequelize');

class DashboardService {
  static async getMetrics(accountId, dateRange = {}) {
    console.log('📊 DashboardService.getMetrics - dateRange recebido:', dateRange);
    const { startDate, endDate } = this.getDateRange(dateRange);
    console.log('📊 DashboardService.getMetrics - após getDateRange:', { startDate, endDate });

    const whereClause = {
      account_id: accountId,
      is_customer: false, // Excluir leads marcados como clientes
      ...(startDate && endDate && {
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      })
    };

    console.log('📊 DashboardService.getMetrics - whereClause:', JSON.stringify(whereClause, null, 2));

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
        is_customer: false, // Excluir leads marcados como clientes
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
      is_customer: false, // Excluir leads marcados como clientes
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

  static async getLeadsByTimeframe(accountId, timeframe = 'week', dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);
    
    const data = [];
    let periods = 7;
    let unit = 'day';
    let now = new Date();
    let referenceStart = startDate || now;

    // Se houver dateRange, calcular períodos baseado no range
    if (startDate && endDate) {
      const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      periods = Math.min(daysDiff, 30); // Limite de 30 períodos
      unit = 'day';
      referenceStart = new Date(startDate);
    } else {
      // Usar timeframe padrão
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
    }

    for (let i = 0; i < periods; i++) {
      const date = new Date(referenceStart);
      
      if (unit === 'day') {
        date.setDate(date.getDate() + i);
      } else {
        date.setMonth(date.getMonth() + i);
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
          is_customer: false, // Excluir leads marcados como clientes
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

  // Nova métrica: Tempo médio até conversão por campanha
  static async getAverageConversionTimeByCampaign(accountId, dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);

    const whereClause = {
      account_id: accountId,
      status: 'won',
      is_customer: false, // Excluir leads marcados como clientes
      won_at: { [Op.not]: null },
      campaign: { [Op.not]: null },
      ...(startDate && endDate && {
        won_at: {
          [Op.between]: [startDate, endDate]
        }
      })
    };

    const wonLeads = await Lead.findAll({
      where: whereClause,
      attributes: [
        'campaign',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'total_conversions'],
        // Calcular diferença em segundos entre created_at e won_at
        [
          Lead.sequelize.fn(
            'AVG', 
            Lead.sequelize.fn(
              'EXTRACT',
              Lead.sequelize.literal("EPOCH FROM (won_at - created_at)")
            )
          ), 
          'avg_seconds_to_conversion'
        ]
      ],
      group: ['campaign'],
      raw: true
    });

    return wonLeads.map(lead => ({
      campaign: lead.campaign,
      totalConversions: parseInt(lead.total_conversions),
      averageTimeToConversion: {
        seconds: Math.round(parseFloat(lead.avg_seconds_to_conversion || 0)),
        minutes: Math.round(parseFloat(lead.avg_seconds_to_conversion || 0) / 60),
        hours: Math.round(parseFloat(lead.avg_seconds_to_conversion || 0) / 3600),
        days: Math.round(parseFloat(lead.avg_seconds_to_conversion || 0) / 86400),
        formatted: this.formatDuration(parseFloat(lead.avg_seconds_to_conversion || 0))
      }
    }));
  }

  // Função auxiliar para formatar duração
  static formatDuration(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}min`;
    } else if (seconds < 86400) {
      const hours = Math.round(seconds / 3600);
      const remainingMinutes = Math.round((seconds % 3600) / 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    } else {
      const days = Math.round(seconds / 86400);
      const remainingHours = Math.round((seconds % 86400) / 3600);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  }

  // Novo método: Métricas de tempo por estágio do kanban
  static async getStageTimingMetrics(accountId, dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);

    // Buscar todas as colunas da conta
    const columns = await KanbanColumn.findAll({
      where: {
        account_id: accountId,
        is_active: true
      },
      order: [['position', 'ASC']]
    });

    const stageMetrics = [];

    for (const column of columns) {
      const timeInStage = [];

      // 📊 PARTE 1: Leads atualmente nesta coluna (com filtro de data)
      const currentLeadsWhere = {
        account_id: accountId,
        column_id: column.id,
        is_customer: false, // Excluir leads marcados como clientes
        ...(startDate && endDate && {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        })
      };

      const currentLeads = await Lead.findAll({
        where: currentLeadsWhere,
        attributes: ['id'],
        raw: true
      });

      for (const lead of currentLeads) {
        // Buscar quando este lead entrou nesta coluna (último movimento para cá)
        const entryHistory = await LeadHistory.findOne({
          where: {
            account_id: accountId,
            lead_id: lead.id,
            to_column_id: column.id
          },
          order: [['moved_at', 'DESC']]
        });


        if (entryHistory) {
          // Calcular tempo desde que entrou na coluna até agora
          const timeSpentSoFar = new Date() - new Date(entryHistory.moved_at);
          const days = Math.floor(timeSpentSoFar / (1000 * 60 * 60 * 24));


          timeInStage.push(Math.max(0, days)); // Garantir que não seja negativo
        } else {

          // Se não há histórico de entrada, usar created_at (especialmente para primeira coluna)
          const leadDetails = await Lead.findByPk(lead.id, { attributes: ['createdAt'] });
          if (leadDetails) {
            const timeSpentSoFar = new Date() - new Date(leadDetails.createdAt);
            const days = Math.floor(timeSpentSoFar / (1000 * 60 * 60 * 24));


            timeInStage.push(Math.max(0, days));
          }
        }
      }

      // 📊 PARTE 2: Leads que já saíram desta coluna (histórico completo)
      const exitedLeads = await LeadHistory.findAll({
        where: {
          account_id: accountId,
          from_column_id: column.id,
          ...(startDate && endDate && {
            moved_at: { [Op.between]: [startDate, endDate] }
          })
        },
        order: [['moved_at', 'ASC']]
      });

      for (const exitHistory of exitedLeads) {
        // Buscar quando entrou nesta coluna (movimento mais recente antes de sair)
        const entryHistory = await LeadHistory.findOne({
          where: {
            account_id: accountId,
            lead_id: exitHistory.lead_id,
            to_column_id: column.id,
            moved_at: { [Op.lt]: exitHistory.moved_at }
          },
          order: [['moved_at', 'DESC']]
        });

        if (entryHistory) {
          const timeSpent = new Date(exitHistory.moved_at) - new Date(entryHistory.moved_at);
          const days = Math.floor(timeSpent / (1000 * 60 * 60 * 24));
          timeInStage.push(Math.max(0, days)); // Garantir que não seja negativo
        }
      }

      // Contar leads atualmente nesta coluna
      const currentLeadsCount = currentLeads.length;

      // Contar total de leads que passaram por esta coluna (incluindo os atuais)
      const totalLeadsInStage = await LeadHistory.count({
        where: {
          account_id: accountId,
          to_column_id: column.id,
          ...(startDate && endDate && {
            moved_at: { [Op.between]: [startDate, endDate] }
          })
        }
      });

      const avgDays = timeInStage.length > 0
        ? Math.round(timeInStage.reduce((a, b) => a + b, 0) / timeInStage.length)
        : 0;

      stageMetrics.push({
        columnId: column.id,
        columnName: column.name,
        columnColor: column.color,
        currentLeadsCount,
        totalLeadsProcessed: totalLeadsInStage,
        averageTimeInDays: avgDays,
        averageTimeFormatted: this.formatDays(avgDays)
      });
    }

    return stageMetrics;
  }

  // Novo método: Taxa de conversão entre estágios
  static async getStageConversionRates(accountId, dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);

    const columns = await KanbanColumn.findAll({
      where: {
        account_id: accountId,
        is_active: true
      },
      order: [['position', 'ASC']]
    });

    const conversionRates = [];

    for (let i = 0; i < columns.length - 1; i++) {
      const currentColumn = columns[i];
      const nextColumn = columns[i + 1];

      // Contar leads que entraram na coluna atual
      const leadsEnteredCurrent = await LeadHistory.count({
        where: {
          account_id: accountId,
          to_column_id: currentColumn.id,
          ...(startDate && endDate && {
            moved_at: { [Op.between]: [startDate, endDate] }
          })
        }
      });

      // Contar leads que avançaram para a próxima coluna
      const leadsAdvancedToNext = await LeadHistory.count({
        where: {
          account_id: accountId,
          from_column_id: currentColumn.id,
          to_column_id: nextColumn.id,
          ...(startDate && endDate && {
            moved_at: { [Op.between]: [startDate, endDate] }
          })
        }
      });

      const conversionRate = leadsEnteredCurrent > 0
        ? ((leadsAdvancedToNext / leadsEnteredCurrent) * 100).toFixed(2)
        : 0;

      conversionRates.push({
        fromStage: currentColumn.name,
        toStage: nextColumn.name,
        leadsEntered: leadsEnteredCurrent,
        leadsAdvanced: leadsAdvancedToNext,
        conversionRate: parseFloat(conversionRate)
      });
    }

    return conversionRates;
  }

  // Novo método: Leads estagnados
  static async getStagnantLeads(accountId, daysThreshold = 7) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const stagnantLeads = await Lead.findAll({
      where: {
        account_id: accountId,
        updatedAt: { [Op.lt]: thresholdDate },
        status: { [Op.notIn]: ['won', 'lost'] }, // Excluir leads ganhos e perdidos
        is_customer: false // Excluir leads marcados como clientes
      },
      attributes: ['id', 'name', 'phone', 'email', 'value', 'updatedAt'], // Adicionar updatedAt explicitamente
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        }
      ],
      order: [['updatedAt', 'ASC']],
      limit: 50 // Limitar para performance
    });

    return stagnantLeads.map(lead => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      value: lead.value,
      daysSinceUpdate: Math.floor((new Date() - new Date(lead.updatedAt)) / (1000 * 60 * 60 * 24)),
      column: {
        id: lead.column?.id,
        name: lead.column?.name,
        color: lead.column?.color
      },
      updated_at: lead.updatedAt
    }));
  }

  // Novo método: Métricas detalhadas combinadas
  static async getDetailedStageMetrics(accountId, dateRange = {}) {
    const [timingMetrics, conversionRates] = await Promise.all([
      this.getStageTimingMetrics(accountId, dateRange),
      this.getStageConversionRates(accountId, dateRange)
    ]);

    // Combinar dados de timing com conversão
    const detailedMetrics = timingMetrics.map(timing => {
      const conversionData = conversionRates.find(conv => conv.fromStage === timing.columnName);

      return {
        ...timing,
        conversionToNext: conversionData ? {
          toStage: conversionData.toStage,
          rate: conversionData.conversionRate,
          leadsAdvanced: conversionData.leadsAdvanced
        } : null
      };
    });

    return detailedMetrics;
  }

  // Método auxiliar: Formatar dias
  // ===============================
  // NOVOS MÉTODOS: RANKING DE VENDEDORES
  // ===============================

  static async getSalesRankingData(accountId, dateRange = {}) {
    const { startDate, endDate } = this.getDateRange(dateRange);

    // Buscar todos os usuários da conta
    const users = await User.findAll({
      where: {
        account_id: accountId,
        is_active: true
      }
    });

    const salesRanking = [];

    for (const user of users) {
      // Buscar leads atribuídos para este usuário
      const leadWhere = {
        account_id: accountId,
        assigned_to_user_id: user.id,
        is_customer: false, // Excluir leads marcados como clientes
        ...(startDate && endDate && {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        })
      };

      const assignedLeads = await Lead.findAll({
        where: leadWhere
      });

      const newLeadsAssigned = assignedLeads.length;

      // Contar leads ganhos
      const leadsWon = assignedLeads.filter(lead => lead.status === 'won').length;

      // Calcular taxa de conversão
      const conversionRate = newLeadsAssigned > 0 ? (leadsWon / newLeadsAssigned * 100).toFixed(2) : 0;

      // Contar atividades realizadas para este usuário
      const activitiesWhere = {
        account_id: accountId,
        user_id: user.id,
        ...(startDate && endDate && {
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        })
      };

      const activitiesCount = await LeadActivity.count({
        where: activitiesWhere
      });

      // Calcular receita total
      const totalRevenue = assignedLeads
        .filter(lead => lead.status === 'won' && lead.value)
        .reduce((sum, lead) => sum + parseFloat(lead.value), 0);

      salesRanking.push({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        newLeadsAssigned,
        leadsWon,
        conversionRate: parseFloat(conversionRate),
        activitiesCount,
        totalRevenue: parseFloat(totalRevenue.toFixed(2))
      });
    }

    // Ordenar por leads ganhos (desc) e depois por taxa de conversão (desc)
    return salesRanking.sort((a, b) => {
      if (b.leadsWon !== a.leadsWon) return b.leadsWon - a.leadsWon;
      return b.conversionRate - a.conversionRate;
    });
  }

  static async getSalesPerformanceChart(accountId, dateRange = {}) {
    const rankingData = await this.getSalesRankingData(accountId, dateRange);

    // Transformar para formato do gráfico de barras
    return rankingData.map(item => ({
      name: item.user.name.split(' ')[0], // Primeiro nome para economizar espaço
      leadsWon: item.leadsWon,
      totalRevenue: item.totalRevenue,
      conversionRate: item.conversionRate,
      fullName: item.user.name,
      role: item.user.role
    }));
  }

  static async getActivityVsConversionData(accountId, dateRange = {}) {
    const rankingData = await this.getSalesRankingData(accountId, dateRange);

    // Transformar para formato do scatter plot
    return rankingData
      .filter(item => item.newLeadsAssigned > 0) // Só incluir quem tem leads atribuídos
      .map(item => ({
        name: item.user.name,
        x: item.activitiesCount, // Eixo X: Número de atividades
        y: item.conversionRate,  // Eixo Y: Taxa de conversão
        leadsWon: item.leadsWon,
        newLeadsAssigned: item.newLeadsAssigned,
        totalRevenue: item.totalRevenue,
        role: item.user.role
      }));
  }

  // ===============================

  static formatDays(days) {
    if (days === 0) return '0 dias';
    if (days === 1) return '1 dia';
    if (days < 7) return `${days} dias`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      if (remainingDays === 0) return `${weeks} sem${weeks > 1 ? 's' : ''}`;
      return `${weeks} sem${weeks > 1 ? 's' : ''} ${remainingDays}d`;
    }
    const months = Math.floor(days / 30);
    return `${months} mês${months > 1 ? 'es' : ''}`;
  }

  static getDateRange(dateRange) {
    const { startDate, endDate } = dateRange;

    if (startDate && endDate) {
      // Ajustar endDate para incluir todo o dia (23:59:59)
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      
      return {
        startDate: new Date(startDate),
        endDate: endDateTime
      };
    }

    return {};
  }
}

module.exports = DashboardService;
