const { CronJob, CronJobExecution } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const CronJobService = require('../services/CronJobService');
const cron = require('node-cron');

const cronJobController = {
  // Listar cron jobs
  list: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      account_id: req.account.id
    };

    if (type) whereClause.type = type;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const { count, rows: jobs } = await CronJob.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: CronJobExecution,
          as: 'executions',
          limit: 5,
          order: [['created_at', 'DESC']],
          attributes: ['id', 'status', 'duration_ms', 'processed_items', 'affected_items', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      jobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  }),

  // Obter cron job por ID
  getById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const job = await CronJob.findOne({
      where: {
        id,
        account_id: req.account.id
      },
      include: [
        {
          model: CronJobExecution,
          as: 'executions',
          order: [['created_at', 'DESC']],
          limit: 20
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        error: 'Cron job não encontrado'
      });
    }

    res.json({ job });
  }),

  // Criar cron job
  create: asyncHandler(async (req, res) => {
    const {
      name,
      description,
      type,
      cron_expression,
      conditions = {},
      actions = {},
      timeout_seconds = 300,
      max_retries = 3
    } = req.body;

    // Validar campos obrigatórios
    if (!name || !type || !cron_expression) {
      return res.status(400).json({
        error: 'Nome, tipo e expressão cron são obrigatórios'
      });
    }

    // Validar expressão cron
    if (!cron.validate(cron_expression)) {
      return res.status(400).json({
        error: 'Expressão cron inválida'
      });
    }

    // Validar tipo
    const validTypes = [
      'lead_assignment', 'status_update', 'email_notification',
      'report_generation', 'data_cleanup', 'webhook_retry',
      'lead_scoring', 'follow_up_reminder', 'custom_automation'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Tipo de cron job inválido',
        validTypes
      });
    }

    const job = await CronJob.create({
      account_id: req.account.id,
      name,
      description,
      type,
      cron_expression,
      conditions,
      actions,
      timeout_seconds,
      max_retries,
      is_active: false // Criado como inativo
    });

    res.status(201).json({
      message: 'Cron job criado com sucesso',
      job
    });
  }),

  // Atualizar cron job
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const job = await CronJob.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!job) {
      return res.status(404).json({
        error: 'Cron job não encontrado'
      });
    }

    // Validar expressão cron se fornecida
    if (updateData.cron_expression && !cron.validate(updateData.cron_expression)) {
      return res.status(400).json({
        error: 'Expressão cron inválida'
      });
    }

    // Se está ativo e a expressão mudou, reagendar
    const needsReschedule = job.is_active && 
      updateData.cron_expression && 
      updateData.cron_expression !== job.cron_expression;

    await job.update(updateData);

    if (needsReschedule) {
      await CronJobService.scheduleJob(job);
    }

    res.json({
      message: 'Cron job atualizado com sucesso',
      job
    });
  }),

  // Deletar cron job
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const job = await CronJob.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!job) {
      return res.status(404).json({
        error: 'Cron job não encontrado'
      });
    }

    // Parar job se estiver ativo
    if (job.is_active) {
      // Remover do scheduler
      const task = CronJobService.scheduledTasks.get(job.id);
      if (task) {
        task.stop();
        CronJobService.scheduledTasks.delete(job.id);
      }
    }

    await job.destroy();

    res.json({
      message: 'Cron job deletado com sucesso'
    });
  }),

  // Ativar/desativar cron job
  toggle: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const job = await CronJob.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!job) {
      return res.status(404).json({
        error: 'Cron job não encontrado'
      });
    }

    const newStatus = !job.is_active;
    await job.update({ is_active: newStatus });

    if (newStatus) {
      // Ativar: agendar job
      const scheduled = await CronJobService.scheduleJob(job);
      if (!scheduled) {
        return res.status(400).json({
          error: 'Erro ao agendar cron job'
        });
      }
    } else {
      // Desativar: parar job
      const task = CronJobService.scheduledTasks.get(job.id);
      if (task) {
        task.stop();
        CronJobService.scheduledTasks.delete(job.id);
      }
    }

    res.json({
      message: `Cron job ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
      job: {
        id: job.id,
        name: job.name,
        is_active: newStatus
      }
    });
  }),

  // Executar cron job manualmente
  execute: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const job = await CronJob.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!job) {
      return res.status(404).json({
        error: 'Cron job não encontrado'
      });
    }

    // Executar em background
    CronJobService.executeJob(job.id).catch(error => {
      console.error('Erro na execução manual do job:', error);
    });

    res.json({
      message: 'Execução do cron job iniciada',
      job: {
        id: job.id,
        name: job.name
      }
    });
  }),

  // Obter execuções de um job
  getExecutions: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se job pertence à conta
    const job = await CronJob.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!job) {
      return res.status(404).json({
        error: 'Cron job não encontrado'
      });
    }

    const whereClause = { cron_job_id: id };
    if (status) whereClause.status = status;

    const { count, rows: executions } = await CronJobExecution.findAndCountAll({
      where: whereClause,
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

  // Obter tipos de cron jobs disponíveis
  getTypes: asyncHandler(async (req, res) => {
    const types = [
      {
        value: 'lead_assignment',
        label: 'Atribuição de Leads',
        description: 'Atribuir leads automaticamente baseado em critérios'
      },
      {
        value: 'status_update',
        label: 'Atualização de Status',
        description: 'Atualizar status de leads baseado em tempo'
      },
      {
        value: 'email_notification',
        label: 'Notificação por Email',
        description: 'Enviar notificações por email'
      },
      {
        value: 'report_generation',
        label: 'Geração de Relatórios',
        description: 'Gerar relatórios automaticamente'
      },
      {
        value: 'data_cleanup',
        label: 'Limpeza de Dados',
        description: 'Limpar dados antigos do sistema'
      },
      {
        value: 'webhook_retry',
        label: 'Retry de Webhooks',
        description: 'Retentar webhooks que falharam'
      },
      {
        value: 'lead_scoring',
        label: 'Pontuação de Leads',
        description: 'Calcular pontuação de leads'
      },
      {
        value: 'follow_up_reminder',
        label: 'Lembrete de Follow-up',
        description: 'Lembretes para acompanhar leads'
      },
      {
        value: 'custom_automation',
        label: 'Automação Personalizada',
        description: 'Automação customizada'
      }
    ];

    res.json({ types });
  })
};

module.exports = cronJobController;
