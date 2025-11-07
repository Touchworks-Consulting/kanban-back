const { Account, Lead, KanbanColumn } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../database/connection');

const performanceController = {
  /**
   * Calcula a porcentagem de MQL (Marketing Qualified Leads)
   * MQL é identificado por colunas do Kanban marcadas com is_mql: true
   */
  getMQLPercentage: asyncHandler(async (req, res) => {
    console.log(`📊 getMQLPercentage: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const accountId = req.account.id;
    const { start_date, end_date } = req.query;

    // Buscar colunas MQL da conta
    const mqlColumns = await KanbanColumn.findAll({
      where: {
        account_id: accountId,
        is_mql: true,
        is_active: true
      },
      attributes: ['id', 'name', 'color']
    });

    console.log(`📊 Colunas MQL encontradas: ${mqlColumns.length}`);

    // Se não houver colunas marcadas como MQL, retornar aviso
    if (mqlColumns.length === 0) {
      console.log('⚠️ Nenhuma coluna MQL configurada');
      return res.json({
        total_leads: 0,
        mql_leads: 0,
        mql_percentage: 0,
        mql_columns: [],
        warning: 'Nenhuma coluna MQL configurada. Marque as colunas como MQL ao editar o quadro Kanban.'
      });
    }

    const mqlColumnIds = mqlColumns.map(col => col.id);
    console.log(`🎯 IDs das colunas MQL:`, mqlColumnIds);

    // Buscar colunas finalizadas (ganhos e perdidos) para excluir do cálculo
    const finalizedColumns = await KanbanColumn.findAll({
      where: {
        account_id: accountId,
        is_active: true,
        [Op.or]: [
          { is_won: true },
          { is_lost: true }
        ]
      },
      attributes: ['id', 'name', 'is_won', 'is_lost']
    });

    const finalizedColumnIds = finalizedColumns.map(col => col.id);
    console.log(`🚫 Colunas finalizadas (excluídas do MQL): ${finalizedColumns.length}`, finalizedColumnIds);

    // Construir where clause com filtro de data se fornecido
    const whereClause = {
      account_id: accountId
    };

    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Contar total de leads ATIVOS (excluindo colunas finalizadas)
    const whereActiveLeads = {
      ...whereClause,
      column_id: {
        [Op.notIn]: finalizedColumnIds.length > 0 ? finalizedColumnIds : [-1] // -1 para não quebrar query se array vazio
      }
    };

    const totalLeads = await Lead.count({ where: whereActiveLeads });

    // Para fins de log, contar também leads finalizados
    const finalizedLeads = await Lead.count({
      where: {
        ...whereClause,
        column_id: {
          [Op.in]: finalizedColumnIds.length > 0 ? finalizedColumnIds : [-1]
        }
      }
    });
    console.log(`📊 Leads ativos: ${totalLeads}, Leads finalizados (excluídos): ${finalizedLeads}`);

    // Contar leads em colunas MQL
    const mqlLeads = await Lead.count({
      where: {
        ...whereClause,
        column_id: {
          [Op.in]: mqlColumnIds
        }
      }
    });

    // Calcular porcentagem
    const mqlPercentage = totalLeads > 0
      ? ((mqlLeads / totalLeads) * 100).toFixed(2)
      : 0;

    console.log(`✅ MQL calculado: ${mqlLeads}/${totalLeads} = ${mqlPercentage}%`);

    res.json({
      total_leads: totalLeads,
      mql_leads: mqlLeads,
      mql_percentage: parseFloat(mqlPercentage),
      mql_columns: mqlColumns.map(col => ({
        id: col.id,
        name: col.name,
        color: col.color
      }))
    });
  }),

  /**
   * Agrega motivos de perda
   * Retorna contagem e porcentagem de cada motivo
   */
  getLossReasons: asyncHandler(async (req, res) => {
    console.log(`📊 getLossReasons: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const accountId = req.account.id;
    const { start_date, end_date } = req.query;

    // Construir where clause
    const whereClause = {
      account_id: accountId,
      status: 'lost',
      lost_reason: {
        [Op.ne]: null,
        [Op.ne]: ''
      }
    };

    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Agregar motivos de perda
    const lossReasons = await Lead.findAll({
      where: whereClause,
      attributes: [
        'lost_reason',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['lost_reason'],
      order: [[Sequelize.literal('count'), 'DESC']],
      raw: true
    });

    // Calcular total
    const totalLost = lossReasons.reduce((sum, r) => sum + parseInt(r.count), 0);

    // Formatar resultados com porcentagem
    const reasons = lossReasons.map(r => ({
      reason: r.lost_reason,
      count: parseInt(r.count),
      percentage: totalLost > 0
        ? parseFloat(((parseInt(r.count) / totalLost) * 100).toFixed(2))
        : 0
    }));

    console.log(`✅ Motivos de perda encontrados: ${reasons.length} motivos, ${totalLost} leads perdidos`);

    res.json({
      reasons,
      total_lost: totalLost,
      top_3: reasons.slice(0, 3)
    });
  }),

  /**
   * Distribuição de leads por status customizado
   * Retorna contagem e porcentagem para cada status
   */
  getStatusDistribution: asyncHandler(async (req, res) => {
    console.log(`📊 getStatusDistribution: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

    const accountId = req.account.id;
    const { start_date, end_date } = req.query;

    // Buscar custom_statuses da conta
    const account = await Account.findByPk(accountId, {
      attributes: ['id', 'custom_statuses']
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const customStatuses = account.custom_statuses || [];
    console.log(`📊 Calculando distribuição para ${customStatuses.length} status customizados`);

    // Filtrar apenas status com value válido
    const validStatuses = customStatuses.filter(s => s.value);
    console.log(`📊 ${validStatuses.length} status válidos após filtro`);

    // Construir where clause base
    const whereBase = {
      account_id: accountId
    };

    if (start_date && end_date) {
      whereBase.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Contar leads para cada status
    const distributionPromises = validStatuses.map(async (status) => {
      const count = await Lead.count({
        where: {
          ...whereBase,
          status: status.value
        }
      });

      return {
        status_value: status.value,
        status_label: status.label,
        count,
        color: status.color || '#gray',
        is_final: status.is_final || false
      };
    });

    const distribution = await Promise.all(distributionPromises);

    // Calcular total e porcentagens
    const total = distribution.reduce((sum, s) => sum + s.count, 0);

    const distributionWithPercentages = distribution.map(s => ({
      ...s,
      percentage: total > 0
        ? parseFloat(((s.count / total) * 100).toFixed(2))
        : 0
    }));

    // Separar em ativos e finalizados
    const activeStatuses = distributionWithPercentages.filter(s => !s.is_final);
    const finalStatuses = distributionWithPercentages.filter(s => s.is_final);

    console.log(`✅ Distribuição calculada: ${total} leads total`);

    res.json({
      distribution: distributionWithPercentages,
      active_distribution: activeStatuses,
      final_distribution: finalStatuses,
      total_leads: total,
      summary: {
        total: total,
        active: activeStatuses.reduce((sum, s) => sum + s.count, 0),
        final: finalStatuses.reduce((sum, s) => sum + s.count, 0)
      }
    });
  })
};

module.exports = performanceController;
