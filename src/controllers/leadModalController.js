const LeadModalService = require('../services/LeadModalService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting para operações do modal
const modalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requests por window por IP
  message: 'Muitas requisições do modal. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

const leadModalController = {
  // Aplicar rate limiting a todas as rotas do modal
  applyRateLimit: modalRateLimit,

  /**
   * GET /api/leads/:leadId/modal
   * Obter dados completos do modal do lead
   */
  getModalData: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const accountId = req.account.id;

    // Validação básica do UUID
    if (!leadId || !leadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'ID do lead inválido'
      });
    }

    try {
      const modalData = await LeadModalService.getLeadModalData(leadId, accountId);

      res.json({
        success: true,
        data: modalData
      });
    } catch (error) {
      if (error.message === 'Lead não encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Lead não encontrado'
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/leads/:leadId/timeline
   * Obter timeline paginada de atividades
   */
  getTimeline: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const accountId = req.account.id;

    // Validações
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10))); // máximo 50

    if (!leadId || !leadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'ID do lead inválido'
      });
    }

    const timelineData = await LeadModalService.getTimelinePaginated(
      leadId,
      accountId,
      pageNum,
      limitNum
    );

    res.json({
      success: true,
      data: timelineData
    });
  }),

  /**
   * POST /api/leads/:leadId/activities
   * Adicionar nova atividade ao lead
   */
  addActivity: asyncHandler(async (req, res) => {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { leadId } = req.params;
    const accountId = req.account.id;
    const userId = req.user.id;
    const activityData = req.body;

    // Validação do tipo de atividade
    const allowedTypes = [
      'call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'follow_up'
    ];

    if (!allowedTypes.includes(activityData.type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de atividade inválido'
      });
    }

    const activity = await LeadModalService.addActivity(
      leadId,
      accountId,
      userId,
      activityData
    );

    res.status(201).json({
      success: true,
      message: 'Atividade adicionada com sucesso',
      data: activity
    });
  }),

  /**
   * GET /api/leads/:leadId/contacts
   * Obter contatos do lead
   */
  getContacts: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const accountId = req.account.id;

    if (!leadId || !leadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'ID do lead inválido'
      });
    }

    const contacts = await LeadModalService.getContacts(leadId, accountId);

    res.json({
      success: true,
      data: contacts
    });
  }),

  /**
   * POST /api/leads/:leadId/contacts
   * Adicionar novo contato ao lead
   */
  addContact: asyncHandler(async (req, res) => {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { leadId } = req.params;
    const accountId = req.account.id;
    const contactData = req.body;

    // Validações de segurança
    const allowedTypes = ['phone', 'email'];
    const allowedLabels = [
      'primary', 'secondary', 'work', 'personal',
      'mobile', 'home', 'whatsapp', 'commercial'
    ];

    if (!allowedTypes.includes(contactData.type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de contato inválido'
      });
    }

    if (contactData.label && !allowedLabels.includes(contactData.label)) {
      return res.status(400).json({
        success: false,
        message: 'Label de contato inválido'
      });
    }

    try {
      const contact = await LeadModalService.addContact(
        leadId,
        accountId,
        contactData
      );

      res.status(201).json({
        success: true,
        message: 'Contato adicionado com sucesso',
        data: contact
      });
    } catch (error) {
      if (error.message.includes('já existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/leads/:leadId/files
   * Obter arquivos do lead
   */
  getFiles: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const accountId = req.account.id;

    if (!leadId || !leadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'ID do lead inválido'
      });
    }

    const files = await LeadModalService.getFiles(leadId, accountId);

    res.json({
      success: true,
      data: files
    });
  }),

  /**
   * PUT /api/leads/:leadId
   * Atualizar dados do lead
   */
  updateLead: asyncHandler(async (req, res) => {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { leadId } = req.params;
    const accountId = req.account.id;
    const userId = req.user.id;
    const updateData = req.body;

    // Remover campos que não devem ser atualizados diretamente
    delete updateData.id;
    delete updateData.account_id;
    delete updateData.created_at;
    delete updateData.updated_at;

    // Validar campos permitidos
    const allowedFields = [
      'name', 'email', 'phone', 'message', 'status', 'platform',
      'column_id', 'assigned_to_user_id', 'notes', 'priority'
    ];

    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos não permitidos: ${invalidFields.join(', ')}`
      });
    }

    try {
      const updatedLead = await LeadModalService.updateLead(
        leadId,
        accountId,
        userId,
        updateData
      );

      res.json({
        success: true,
        message: 'Lead atualizado com sucesso',
        data: updatedLead
      });
    } catch (error) {
      if (error.message === 'Lead não encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Lead não encontrado'
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/leads/:leadId/stats
   * Obter estatísticas do lead
   */
  getStats: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const accountId = req.account.id;

    if (!leadId || !leadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'ID do lead inválido'
      });
    }

    const stats = await LeadModalService.getLeadStats(leadId, accountId);

    res.json({
      success: true,
      data: stats
    });
  })
};

module.exports = leadModalController;