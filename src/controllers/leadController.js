const { Lead, KanbanColumn, Tag, LeadTag, LeadHistory } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const PlatformDetectionService = require('../services/PlatformDetectionService');
const AutomationService = require('../services/AutomationService');
const { Op } = require('sequelize');
const { processSequelizeResponse } = require('../utils/dateSerializer');

const leadController = {
  // Listar leads com filtros e paginação
  list: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, platform, search, column_id } = req.query;
    const phoneParam = Array.isArray(req.query.phone)
      ? req.query.phone[0]
      : req.query.phone;
    const phone = typeof phoneParam === 'string' ? phoneParam.trim() : '';

    const offset = (page - 1) * limit;

    const whereClause = {
      account_id: req.account.id
    };

    if (phone) {
      whereClause.phone = phone;
    }

    // Filtros
    if (status) {
      whereClause.status = status;
    }

    if (platform) {
      whereClause.platform = platform;
    }

    if (column_id) {
      whereClause.column_id = column_id;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: leads } = await Lead.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ],
      order: [['position', 'ASC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      leads: processSequelizeResponse(leads),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  }),

  // Obter lead por ID
  getById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findOne({
      where: {
        id,
        account_id: req.account.id
      },
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    res.json({ lead: processSequelizeResponse(lead) });
  }),

  // Criar novo lead
  create: asyncHandler(async (req, res) => {
    const { tags, ...leadData } = req.body;
    leadData.account_id = req.account.id;

    // Detectar plataforma se não fornecida
    if (!leadData.platform && (leadData.source_url || leadData.message)) {
      const detection = await PlatformDetectionService.detectPlatform(
        leadData.source_url,
        leadData.message,
        req.account.id
      );
      leadData.platform = detection.platform;
      if (!leadData.campaign) {
        leadData.campaign = detection.campaign;
      }
    }

    // Se não especificou coluna, usar a coluna "Leads Entrantes"
    if (!leadData.column_id) {
      const defaultColumn = await KanbanColumn.findOne({
        where: {
          account_id: req.account.id,
          is_system: true
        }
      });
      if (defaultColumn) {
        leadData.column_id = defaultColumn.id;
      }
    }

    // Definir posição se não especificada
    if (leadData.column_id && !leadData.position) {
      const maxPosition = await Lead.max('position', {
        where: {
          account_id: req.account.id,
          column_id: leadData.column_id
        }
      }) || 0;
      leadData.position = maxPosition + 1;
    }

    const lead = await Lead.create(leadData);

    // 📊 REGISTRAR HISTÓRICO: Lead criado em uma coluna
    if (leadData.column_id) {
      await LeadHistory.create({
        lead_id: lead.id,
        account_id: req.account.id,
        from_column_id: null, // null indica criação
        to_column_id: leadData.column_id,
        action_type: 'created',
        moved_at: new Date(),
        metadata: {
          leadName: leadData.name,
          platform: leadData.platform,
          campaign: leadData.campaign
        }
      });
    }

    // Associar tags se fornecidas
    if (tags && tags.length > 0) {
      const validTags = await Tag.findAll({
        where: {
          id: { [Op.in]: tags },
          account_id: req.account.id
        }
      });

      await lead.setTags(validTags);
    }

    // Buscar lead criado com relacionamentos
    const createdLead = await Lead.findByPk(lead.id, {
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      message: 'Lead criado com sucesso',
      lead: createdLead
    });

    // Disparar automações para lead criado
    AutomationService.triggerAutomations('lead_created', {
      lead: createdLead.toJSON(),
      account_id: req.account.id
    }, req.account.id).catch(error => {
      console.error('Erro ao disparar automações:', error);
    });
  }),

  // Atualizar lead
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tags, ...updateData } = req.body;

    const lead = await Lead.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    // 📊 REGISTRAR HISTÓRICO: Mudança de coluna
    const willMoveColumn = updateData.column_id && updateData.column_id !== lead.column_id;

    // Atualizar posição se mudou de coluna
    if (willMoveColumn) {
      const maxPosition = await Lead.max('position', {
        where: {
          account_id: req.account.id,
          column_id: updateData.column_id
        }
      }) || 0;
      updateData.position = maxPosition + 1;
    }

    // Capturar dados anteriores para automações
    const previousData = {
      status: lead.status,
      column_id: lead.column_id
    };

    // ⏰ RASTREAR DATA DE CONVERSÃO
    // Se o status está mudando para 'won' ou 'lost', registrar quando aconteceu
    if (updateData.status && updateData.status !== lead.status) {
      if (updateData.status === 'won') {
        updateData.won_at = new Date();
        updateData.lost_at = null; // Limpar lost_at se estava perdido antes
      } else if (updateData.status === 'lost') {
        updateData.lost_at = new Date();
        updateData.won_at = null; // Limpar won_at se estava ganho antes
      } else {
        // Se mudou para outro status que não seja won/lost, limpar ambos
        if (lead.status === 'won' || lead.status === 'lost') {
          updateData.won_at = null;
          updateData.lost_at = null;
        }
      }
    }

    await lead.update(updateData);

    // 📊 REGISTRAR HISTÓRICO: Após atualizar o lead, registrar a movimentação
    if (willMoveColumn) {
      await LeadHistory.create({
        lead_id: lead.id,
        account_id: req.account.id,
        from_column_id: previousData.column_id,
        to_column_id: updateData.column_id,
        action_type: 'moved',
        moved_at: new Date(),
        metadata: {
          leadName: lead.name,
          previousStatus: previousData.status,
          newStatus: updateData.status || lead.status,
          updatedBy: req.user?.email || 'system'
        }
      });
    }

    // Atualizar tags se fornecidas
    if (tags !== undefined) {
      if (tags.length > 0) {
        const validTags = await Tag.findAll({
          where: {
            id: { [Op.in]: tags },
            account_id: req.account.id
          }
        });
        await lead.setTags(validTags);
      } else {
        await lead.setTags([]);
      }
    }

    // Buscar lead atualizado com relacionamentos
    const updatedLead = await Lead.findByPk(lead.id, {
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      message: 'Lead atualizado com sucesso',
      lead: updatedLead
    });

    // Disparar automações baseadas nas mudanças
    if (updateData.status && updateData.status !== previousData.status) {
      AutomationService.triggerAutomations('status_changed', {
        lead: updatedLead.toJSON(),
        previousStatus: previousData.status,
        newStatus: updateData.status,
        account_id: req.account.id
      }, req.account.id).catch(error => {
        console.error('Erro ao disparar automações de status:', error);
      });
    }

    if (updateData.column_id && updateData.column_id !== previousData.column_id) {
      AutomationService.triggerAutomations('column_moved', {
        lead: updatedLead.toJSON(),
        previousColumnId: previousData.column_id,
        newColumnId: updateData.column_id,
        account_id: req.account.id
      }, req.account.id).catch(error => {
        console.error('Erro ao disparar automações de coluna:', error);
      });
    }
  }),

  // Deletar lead
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    await lead.destroy();

    res.json({
      message: 'Lead deletado com sucesso'
    });
  }),

  // Buscar lead por telefone
  getByPhone: asyncHandler(async (req, res) => {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Parâmetro phone é obrigatório' });
    }

    const lead = await Lead.findOne({
      where: {
        account_id: req.account.id,
        phone
      },
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({ lead: processSequelizeResponse(lead) });
  }),

  // Mover lead para outra coluna/posição
  move: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { column_id, position, lost_reason } = req.body;

    console.log(`🚀 MOVE ENDPOINT CHAMADO - Lead: ${id}, Coluna: ${column_id}, Position: ${position}`);

    const lead = await Lead.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    // Verificar se a coluna pertence à conta
    const column = await KanbanColumn.findOne({
      where: {
        id: column_id,
        account_id: req.account.id
      }
    });

    if (!column) {
      return res.status(404).json({
        error: 'Coluna não encontrada'
      });
    }

    const previousColumnId = lead.column_id;

    console.log(`🔄 Movendo lead para coluna: "${column.name}"`);

    // Primeiro, fazer a movimentação simples
    await lead.update({
      column_id,
      position: position || 0
    });

    // Depois, verificar se precisa atualizar status baseado na coluna
    const columnName = column.name.toLowerCase();
    console.log(`🔍 Analisando coluna: "${column.name}" (lowercase: "${columnName}")`);
    let statusUpdateData = null;

    if (columnName.includes('ganho') || columnName.includes('ganhos')) {
      console.log('✅ Detectada coluna de GANHO - alterando status para "won"');
      statusUpdateData = {
        status: 'won',
        won_at: new Date(),
        lost_reason: null,
        lost_at: null
      };
    } else if (columnName.includes('perdido') || columnName.includes('perdidos')) {
      console.log('❌ Detectada coluna de PERDIDO - alterando status para "lost"');
      statusUpdateData = {
        status: 'lost',
        lost_at: new Date(),
        won_reason: null,
        won_at: null
      };
      // Incluir motivo de perda se fornecido
      if (lost_reason) {
        console.log(`📝 Motivo de perda fornecido: "${lost_reason}"`);
        statusUpdateData.lost_reason = lost_reason;
      }
    } else {
      console.log('ℹ️  Coluna não corresponde a ganho/perdido - mantendo status atual');
    }

    // Se há necessidade de atualizar status, fazer uma segunda atualização
    if (statusUpdateData) {
      console.log('📝 Atualizando status do lead:', statusUpdateData);
      await lead.update(statusUpdateData);
    }

    // 📊 REGISTRAR HISTÓRICO: Movimentação via endpoint move
    await LeadHistory.create({
      lead_id: lead.id,
      account_id: req.account.id,
      from_column_id: previousColumnId,
      to_column_id: column_id,
      action_type: 'moved',
      moved_at: new Date(),
      metadata: {
        leadName: lead.name,
        movedBy: req.user?.email || 'system',
        moveType: 'manual_move_endpoint'
      }
    });

    const updatedLead = await Lead.findByPk(lead.id, {
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      message: 'Lead movido com sucesso',
      lead: updatedLead
    });
  })
};

module.exports = leadController;
