const { Automation, AutomationExecution, Lead, Tag, KanbanColumn } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const AutomationService = require('../services/AutomationService');

const automationController = {
  // Listar automações
  list: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, trigger_type, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      account_id: req.account.id
    };

    if (trigger_type) whereClause.trigger_type = trigger_type;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const { count, rows: automations } = await Automation.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: AutomationExecution,
          as: 'executions',
          limit: 5,
          order: [['created_at', 'DESC']],
          attributes: ['id', 'status', 'actions_completed', 'actions_total', 'created_at']
        }
      ],
      order: [['priority', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      automations,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  }),

  // Obter automação por ID
  getById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const automation = await Automation.findOne({
      where: {
        id,
        account_id: req.account.id
      },
      include: [
        {
          model: AutomationExecution,
          as: 'executions',
          order: [['created_at', 'DESC']],
          limit: 20,
          include: [
            {
              model: Lead,
              as: 'lead',
              attributes: ['id', 'name', 'phone', 'email']
            }
          ]
        }
      ]
    });

    if (!automation) {
      return res.status(404).json({
        error: 'Automação não encontrada'
      });
    }

    res.json({ automation });
  }),

  // Criar automação
  create: asyncHandler(async (req, res) => {
    const {
      name,
      description,
      trigger_type,
      trigger_conditions = {},
      actions = [],
      priority = 0,
      delay_minutes = 0
    } = req.body;

    // Validar campos obrigatórios
    if (!name || !trigger_type || !actions.length) {
      return res.status(400).json({
        error: 'Nome, tipo de trigger e ações são obrigatórios'
      });
    }

    // Validar tipo de trigger
    const validTriggers = [
      'lead_created', 'status_changed', 'time_based',
      'tag_added', 'column_moved', 'webhook_received', 'manual_trigger'
    ];

    if (!validTriggers.includes(trigger_type)) {
      return res.status(400).json({
        error: 'Tipo de trigger inválido',
        validTriggers
      });
    }

    // Validar ações
    const validActionTypes = [
      'update_lead_status', 'move_lead_column', 'add_tag',
      'remove_tag', 'update_lead_field', 'send_notification'
    ];

    for (const action of actions) {
      if (!validActionTypes.includes(action.type)) {
        return res.status(400).json({
          error: `Tipo de ação inválido: ${action.type}`,
          validActionTypes
        });
      }
    }

    const automation = await Automation.create({
      account_id: req.account.id,
      name,
      description,
      trigger_type,
      trigger_conditions,
      actions,
      priority,
      delay_minutes,
      is_active: false // Criado como inativo
    });

    res.status(201).json({
      message: 'Automação criada com sucesso',
      automation
    });
  }),

  // Atualizar automação
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const automation = await Automation.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!automation) {
      return res.status(404).json({
        error: 'Automação não encontrada'
      });
    }

    await automation.update(updateData);

    res.json({
      message: 'Automação atualizada com sucesso',
      automation
    });
  }),

  // Deletar automação
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const automation = await Automation.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!automation) {
      return res.status(404).json({
        error: 'Automação não encontrada'
      });
    }

    await automation.destroy();

    res.json({
      message: 'Automação deletada com sucesso'
    });
  }),

  // Ativar/desativar automação
  toggle: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const automation = await Automation.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!automation) {
      return res.status(404).json({
        error: 'Automação não encontrada'
      });
    }

    const newStatus = !automation.is_active;
    await automation.update({ is_active: newStatus });

    res.json({
      message: `Automação ${newStatus ? 'ativada' : 'desativada'} com sucesso`,
      automation: {
        id: automation.id,
        name: automation.name,
        is_active: newStatus
      }
    });
  }),

  // Executar automação manualmente
  execute: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lead_id, trigger_data = {} } = req.body;

    const automation = await Automation.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!automation) {
      return res.status(404).json({
        error: 'Automação não encontrada'
      });
    }

    // Se lead_id fornecido, buscar lead
    let lead = null;
    if (lead_id) {
      lead = await Lead.findOne({
        where: {
          id: lead_id,
          account_id: req.account.id
        }
      });

      if (!lead) {
        return res.status(404).json({
          error: 'Lead não encontrado'
        });
      }
    }

    // Criar execução
    const execution = await AutomationExecution.create({
      automation_id: automation.id,
      lead_id: lead?.id || null,
      trigger_data: { ...trigger_data, manual: true, lead },
      scheduled_for: new Date(),
      status: 'pending',
      actions_total: automation.actions.length
    });

    // Executar em background
    AutomationService.executeAutomation(execution.id).catch(error => {
      console.error('Erro na execução manual da automação:', error);
    });

    res.json({
      message: 'Execução da automação iniciada',
      execution: {
        id: execution.id,
        automation_id: automation.id,
        automation_name: automation.name
      }
    });
  }),

  // Obter execuções de uma automação
  getExecutions: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se automação pertence à conta
    const automation = await Automation.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!automation) {
      return res.status(404).json({
        error: 'Automação não encontrada'
      });
    }

    const whereClause = { automation_id: id };
    if (status) whereClause.status = status;

    const { count, rows: executions } = await AutomationExecution.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'name', 'phone', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      executions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  }),

  // Obter tipos de triggers disponíveis
  getTriggerTypes: asyncHandler(async (req, res) => {
    const triggerTypes = [
      {
        value: 'lead_created',
        label: 'Lead Criado',
        description: 'Quando um novo lead é criado',
        conditions: ['platform', 'campaign', 'has_email', 'has_phone']
      },
      {
        value: 'status_changed',
        label: 'Status Alterado',
        description: 'Quando o status de um lead muda',
        conditions: ['from_status', 'to_status']
      },
      {
        value: 'column_moved',
        label: 'Coluna Movida',
        description: 'Quando um lead é movido entre colunas',
        conditions: ['from_column', 'to_column']
      },
      {
        value: 'tag_added',
        label: 'Tag Adicionada',
        description: 'Quando uma tag é adicionada a um lead',
        conditions: ['tag_id']
      },
      {
        value: 'time_based',
        label: 'Baseado em Tempo',
        description: 'Execução baseada em cronograma',
        conditions: ['schedule', 'days_after']
      },
      {
        value: 'webhook_received',
        label: 'Webhook Recebido',
        description: 'Quando um webhook é recebido',
        conditions: ['source', 'contains_text']
      },
      {
        value: 'manual_trigger',
        label: 'Trigger Manual',
        description: 'Execução manual da automação',
        conditions: []
      }
    ];

    res.json({ triggerTypes });
  }),

  // Obter tipos de ações disponíveis
  getActionTypes: asyncHandler(async (req, res) => {
    const actionTypes = [
      {
        value: 'update_lead_status',
        label: 'Atualizar Status',
        description: 'Alterar o status do lead',
        fields: [{ name: 'value', type: 'select', options: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] }]
      },
      {
        value: 'move_lead_column',
        label: 'Mover para Coluna',
        description: 'Mover lead para outra coluna',
        fields: [{ name: 'value', type: 'select_column' }]
      },
      {
        value: 'add_tag',
        label: 'Adicionar Tag',
        description: 'Adicionar tag ao lead',
        fields: [{ name: 'value', type: 'select_tag' }]
      },
      {
        value: 'remove_tag',
        label: 'Remover Tag',
        description: 'Remover tag do lead',
        fields: [{ name: 'value', type: 'select_tag' }]
      },
      {
        value: 'update_lead_field',
        label: 'Atualizar Campo',
        description: 'Atualizar um campo específico do lead',
        fields: [
          { name: 'field', type: 'select', options: ['notes', 'value', 'won_reason', 'lost_reason'] },
          { name: 'value', type: 'text' }
        ]
      },
      {
        value: 'send_notification',
        label: 'Enviar Notificação',
        description: 'Enviar notificação por email',
        fields: [
          { name: 'recipient', type: 'email' },
          { name: 'message', type: 'textarea' }
        ]
      }
    ];

    res.json({ actionTypes });
  }),

  // Obter recursos para configuração (colunas, tags)
  getResources: asyncHandler(async (req, res) => {
    const [columns, tags] = await Promise.all([
      KanbanColumn.findAll({
        where: { account_id: req.account.id, is_active: true },
        attributes: ['id', 'name', 'color'],
        order: [['position', 'ASC']]
      }),
      Tag.findAll({
        where: { account_id: req.account.id },
        attributes: ['id', 'name', 'color'],
        order: [['name', 'ASC']]
      })
    ]);

    res.json({
      columns,
      tags,
      statuses: [
        { value: 'new', label: 'Novo' },
        { value: 'contacted', label: 'Contactado' },
        { value: 'qualified', label: 'Qualificado' },
        { value: 'proposal', label: 'Proposta' },
        { value: 'won', label: 'Ganho' },
        { value: 'lost', label: 'Perdido' }
      ]
    });
  })
};

module.exports = automationController;
