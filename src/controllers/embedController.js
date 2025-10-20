const { asyncHandler } = require('../middleware/errorHandler');
const { Lead, KanbanColumn, Tag, User, LeadHistory } = require('../models');
const { Op } = require('sequelize');

/**
 * Busca lead por telefone (para integração externa via API key)
 * GET /api/embed/lead/by-phone?phone=5511999999999
 */
const getLeadByPhone = asyncHandler(async (req, res) => {
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
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  if (!lead) {
    return res.status(404).json({ error: 'Lead não encontrado' });
  }

  res.json(lead);
});

/**
 * Busca lead por ID (para renderização do iframe)
 * GET /api/embed/lead-modal/:leadId
 */
const getLeadById = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  if (!leadId) {
    return res.status(400).json({ error: 'Lead ID é obrigatório' });
  }

  const lead = await Lead.findOne({
    where: {
      id: leadId,
      account_id: req.account.id // Valida que o lead pertence à conta da API key
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
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  if (!lead) {
    return res.status(404).json({
      error: 'Lead não encontrado ou não pertence a esta conta'
    });
  }

  res.json(lead);
});

/**
 * Criar novo lead via iframe/embed
 * POST /api/embed/lead
 */
const createLead = asyncHandler(async (req, res) => {
  const { tags, ...leadData } = req.body;
  
  // Validações básicas
  if (!leadData.name || !leadData.name.trim()) {
    return res.status(400).json({ error: 'Nome do lead é obrigatório' });
  }

  // Adicionar account_id da API key autenticada
  leadData.account_id = req.account.id;

  // Se não especificou coluna, usar a coluna "Leads Entrantes" (primeira coluna do sistema)
  if (!leadData.column_id) {
    const defaultColumn = await KanbanColumn.findOne({
      where: {
        account_id: req.account.id,
        is_system: true
      },
      order: [['position', 'ASC']]
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

  // Criar lead
  const lead = await Lead.create(leadData);

  // Registrar histórico de criação
  if (leadData.column_id) {
    await LeadHistory.create({
      lead_id: lead.id,
      account_id: req.account.id,
      from_column_id: null,
      to_column_id: leadData.column_id,
      action_type: 'created',
      moved_at: new Date(),
      metadata: {
        leadName: leadData.name,
        platform: leadData.platform || 'embed',
        campaign: leadData.campaign || 'Embed/Iframe',
        source: 'embed_api'
      }
    });
  }

  // Associar tags se fornecidas
  if (tags && Array.isArray(tags) && tags.length > 0) {
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
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(201).json(createdLead);
});

module.exports = {
  getLeadByPhone,
  getLeadById,
  createLead
};
