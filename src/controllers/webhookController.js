const { Lead, KanbanColumn } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const PlatformDetectionService = require('../services/PlatformDetectionService');

const webhookController = {
  // Receber lead via webhook
  receiveLead: asyncHandler(async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Chave API necessária'
      });
    }

    // A autenticação por API key já foi feita pelo middleware
    const account = req.account;

    const {
      name,
      phone,
      email,
      message,
      source_url,
      campaign,
      platform,
      metadata = {}
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Nome é obrigatório'
      });
    }

    // Detectar plataforma se não fornecida
    let detectedPlatform = platform;
    let detectedCampaign = campaign;

    if (!platform && (source_url || message)) {
      const detection = await PlatformDetectionService.detectPlatform(
        source_url,
        message,
        account.id
      );
      detectedPlatform = detection.platform;
      if (!campaign) {
        detectedCampaign = detection.campaign;
      }
    }

    // Buscar coluna "Leads Entrantes" ou criar se não existir
    let defaultColumn = await KanbanColumn.findOne({
      where: {
        account_id: account.id,
        is_system: true
      }
    });

    if (!defaultColumn) {
      defaultColumn = await KanbanColumn.create({
        account_id: account.id,
        name: 'Leads Entrantes',
        position: 0,
        color: '#3b82f6',
        is_system: true
      });
    }

    // Obter próxima posição na coluna
    const maxPosition = await Lead.max('position', {
      where: {
        account_id: account.id,
        column_id: defaultColumn.id
      }
    }) || 0;

    // Criar lead
    const lead = await Lead.create({
      account_id: account.id,
      name,
      phone,
      email,
      message,
      source_url,
      campaign: detectedCampaign,
      platform: detectedPlatform,
      column_id: defaultColumn.id,
      position: maxPosition + 1,
      status: 'new',
      metadata: {
        ...metadata,
        webhook_received_at: new Date().toISOString(),
        source: 'webhook'
      }
    });

    // Buscar lead criado com relacionamentos
    const createdLead = await Lead.findByPk(lead.id, {
      include: [
        {
          model: KanbanColumn,
          as: 'column',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    res.status(201).json({
      message: 'Lead recebido com sucesso',
      lead: createdLead
    });
  }),

  // Webhook de teste (para verificar se está funcionando)
  test: asyncHandler(async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Chave API necessária'
      });
    }

    res.json({
      message: 'Webhook funcionando',
      timestamp: new Date().toISOString(),
      account: {
        id: req.account.id,
        name: req.account.name
      }
    });
  })
};

module.exports = webhookController;
