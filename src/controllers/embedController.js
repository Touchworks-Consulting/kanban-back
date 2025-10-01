const { asyncHandler } = require('../middleware/errorHandler');
const { Lead, KanbanColumn, Tag, User } = require('../models');

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

module.exports = {
  getLeadByPhone,
  getLeadById
};
