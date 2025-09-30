const cron = require('node-cron');
const { CronJob, CronJobExecution, Lead, KanbanColumn, Tag, LeadActivity } = require('../models');
const { Op } = require('sequelize');
const ActivityNotificationService = require('./ActivityNotificationService');

class CronJobService {
  constructor() {
    this.runningJobs = new Map(); // Map para controlar jobs em execução
    this.scheduledTasks = new Map(); // Map para tasks agendadas
  }

  /**
   * Inicializar serviço de cron jobs
   */
  async initialize(io = null) {
    console.log('🕐 Inicializando serviço de Cron Jobs...');

    // Configurar Socket.IO no serviço de notificações
    if (io) {
      ActivityNotificationService.setSocketIO(io);
      console.log('🔌 Socket.IO configurado para notificações de atividades');
    }

    // Buscar todos os jobs ativos
    const activeJobs = await CronJob.findAll({
      where: { is_active: true }
    });

    // Agendar cada job
    for (const job of activeJobs) {
      await this.scheduleJob(job);
    }

    console.log(`✅ ${activeJobs.length} Cron Jobs agendados`);
  }

  /**
   * Agendar um job específico
   */
  async scheduleJob(job) {
    try {
      // Validar expressão cron
      if (!cron.validate(job.cron_expression)) {
        console.error(`❌ Expressão cron inválida para job ${job.name}: ${job.cron_expression}`);
        return false;
      }

      // Cancelar task anterior se existir
      if (this.scheduledTasks.has(job.id)) {
        this.scheduledTasks.get(job.id).stop();
        this.scheduledTasks.delete(job.id);
      }

      // Criar nova task
      const task = cron.schedule(job.cron_expression, async () => {
        await this.executeJob(job.id);
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      });

      // Iniciar task
      task.start();
      this.scheduledTasks.set(job.id, task);

      // Calcular próxima execução
      await this.updateNextRunTime(job);

      console.log(`📅 Job agendado: ${job.name} (${job.cron_expression})`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao agendar job ${job.name}:`, error);
      return false;
    }
  }

  /**
   * Executar um job específico
   */
  async executeJob(jobId) {
    // Verificar se job já está sendo executado
    if (this.runningJobs.has(jobId)) {
      console.log(`⏭️ Job ${jobId} já está em execução, pulando...`);
      return;
    }

    let execution = null;
    const startTime = Date.now();

    try {
      // Buscar job
      const job = await CronJob.findByPk(jobId);
      if (!job || !job.is_active) {
        console.log(`⚠️ Job ${jobId} não encontrado ou inativo`);
        return;
      }

      // Marcar como em execução
      this.runningJobs.set(jobId, true);

      // Criar registro de execução
      execution = await CronJobExecution.create({
        cron_job_id: jobId,
        started_at: new Date(),
        status: 'running'
      });

      console.log(`🚀 Executando job: ${job.name}`);

      // Executar baseado no tipo
      const result = await this.executeJobByType(job, execution);

      // Finalizar execução
      const endTime = Date.now();
      const duration = endTime - startTime;

      await execution.update({
        finished_at: new Date(),
        status: 'completed',
        duration_ms: duration,
        processed_items: result.processed || 0,
        affected_items: result.affected || 0,
        output_data: result.data || {}
      });

      // Atualizar estatísticas do job
      await job.update({
        last_run_at: new Date(),
        run_count: job.run_count + 1,
        success_count: job.success_count + 1,
        retry_count: 0
      });

      await this.updateNextRunTime(job);

      console.log(`✅ Job concluído: ${job.name} (${duration}ms)`);

    } catch (error) {
      console.error(`❌ Erro na execução do job ${jobId}:`, error);

      if (execution) {
        await execution.update({
          finished_at: new Date(),
          status: 'failed',
          duration_ms: Date.now() - startTime,
          error_message: error.message
        });

        // Atualizar job com erro
        const job = await CronJob.findByPk(jobId);
        if (job) {
          await job.update({
            last_run_at: new Date(),
            run_count: job.run_count + 1,
            error_count: job.error_count + 1,
            last_error: error.message,
            retry_count: job.retry_count + 1
          });

          // Desativar job se muitos erros
          if (job.retry_count >= job.max_retries) {
            await job.update({ is_active: false });
            console.log(`⚠️ Job ${job.name} desativado após ${job.max_retries} tentativas`);
          }
        }
      }
    } finally {
      // Remover da lista de execução
      this.runningJobs.delete(jobId);
    }
  }

  /**
   * Executar job baseado no tipo
   */
  async executeJobByType(job, execution) {
    switch (job.type) {
      case 'lead_assignment':
        return await this.executeLeadAssignment(job);
      
      case 'status_update':
        return await this.executeStatusUpdate(job);
      
      case 'email_notification':
        return await this.executeEmailNotification(job);
      
      case 'data_cleanup':
        return await this.executeDataCleanup(job);
      
      case 'lead_scoring':
        return await this.executeLeadScoring(job);
      
      case 'follow_up_reminder':
        return await this.executeFollowUpReminder(job);

      case 'activity_overdue':
        return await this.executeActivityOverdue(job);

      default:
        throw new Error(`Tipo de job não implementado: ${job.type}`);
    }
  }

  /**
   * Atribuição automática de leads
   */
  async executeLeadAssignment(job) {
    const conditions = job.conditions || {};
    const actions = job.actions || {};
    
    const whereClause = {
      account_id: job.account_id,
      ...(conditions.status && { status: conditions.status }),
      ...(conditions.platform && { platform: conditions.platform })
    };

    const leads = await Lead.findAll({ where: whereClause });
    let affected = 0;

    for (const lead of leads) {
      if (actions.move_to_column) {
        await lead.update({ column_id: actions.move_to_column });
        affected++;
      }
      
      if (actions.update_status) {
        await lead.update({ status: actions.update_status });
        affected++;
      }
    }

    return { processed: leads.length, affected };
  }

  /**
   * Atualização de status automática
   */
  async executeStatusUpdate(job) {
    const conditions = job.conditions || {};
    const actions = job.actions || {};
    
    // Buscar leads que atendem às condições de tempo
    const timeCondition = conditions.days_in_status || 7;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - timeCondition);

    const leads = await Lead.findAll({
      where: {
        account_id: job.account_id,
        status: conditions.from_status || 'new',
        updated_at: { [Op.lte]: targetDate }
      }
    });

    let affected = 0;
    for (const lead of leads) {
      if (actions.to_status) {
        await lead.update({ status: actions.to_status });
        affected++;
      }
    }

    return { processed: leads.length, affected };
  }

  /**
   * Limpeza de dados antigos
   */
  async executeDataCleanup(job) {
    const conditions = job.conditions || {};
    const daysOld = conditions.days_old || 365;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Limpar execuções antigas de cron jobs
    const deletedExecutions = await CronJobExecution.destroy({
      where: {
        created_at: { [Op.lte]: cutoffDate },
        status: { [Op.in]: ['completed', 'failed'] }
      }
    });

    return { processed: deletedExecutions, affected: deletedExecutions };
  }

  /**
   * Pontuação de leads
   */
  async executeLeadScoring(job) {
    const leads = await Lead.findAll({
      where: { account_id: job.account_id }
    });

    let affected = 0;
    for (const lead of leads) {
      let score = 0;
      
      // Calcular score baseado em critérios
      if (lead.email) score += 10;
      if (lead.phone) score += 15;
      if (lead.platform === 'google') score += 20;
      if (lead.value && lead.value > 0) score += 25;
      
      // Atualizar metadata com score
      const metadata = lead.metadata || {};
      metadata.score = score;
      
      await lead.update({ metadata });
      affected++;
    }

    return { processed: leads.length, affected };
  }

  /**
   * Lembretes de follow-up e atividades
   */
  async executeFollowUpReminder(job) {
    const conditions = job.conditions || {};

    // Se é para verificar lembretes de atividades
    if (conditions.reminder_type === 'activity_reminders') {
      const result = await ActivityNotificationService.checkReminders();
      return {
        processed: result.processed,
        affected: result.processed,
        details: `${result.processed} lembretes verificados e enviados`
      };
    }

    // Lógica original para leads que precisam de follow-up
    const leads = await Lead.findAll({
      where: {
        account_id: job.account_id,
        status: { [Op.in]: ['contacted', 'qualified'] }
      }
    });

    return { processed: leads.length, affected: 0 };
  }

  /**
   * Notificação por email e push
   */
  async executeEmailNotification(job) {
    const conditions = job.conditions || {};

    // Notificações de atividades vencidas
    if (conditions.notification_type === 'overdue_activities') {
      const result = await ActivityNotificationService.notifyOverdueActivities();
      return {
        processed: result.processed,
        affected: result.users_notified,
        details: `${result.processed} atividades vencidas notificadas para ${result.users_notified} usuários`
      };
    }

    // Notificações de atividades do dia
    if (conditions.notification_type === 'today_activities') {
      const result = await ActivityNotificationService.notifyTodayActivities();
      return {
        processed: result.processed,
        affected: result.users_notified,
        details: `${result.processed} atividades do dia notificadas para ${result.users_notified} usuários`
      };
    }

    // Implementação original (outras notificações)
    return { processed: 1, affected: 1 };
  }

  /**
   * Calcular próxima execução
   */
  async updateNextRunTime(job) {
    try {
      // Esta é uma implementação simplificada
      // Para produção, recomenda-se usar uma biblioteca como node-cron-parser
      const now = new Date();
      const nextRun = new Date(now.getTime() + 60000); // +1 minuto (placeholder)
      
      await job.update({ next_run_at: nextRun });
    } catch (error) {
      console.error('Erro ao calcular próxima execução:', error);
    }
  }

  /**
   * Marcar atividades vencidas
   */
  async executeActivityOverdue(job) {
    const now = new Date();

    // Buscar atividades pendentes que estão vencidas
    const overdueActivities = await LeadActivity.findAll({
      where: {
        account_id: job.account_id,
        status: 'pending',
        scheduled_for: {
          [Op.lt]: now
        },
        is_overdue: false
      }
    });

    let affected = 0;

    if (overdueActivities.length > 0) {
      // Marcar como vencidas em batch para melhor performance
      const overdueIds = overdueActivities.map(activity => activity.id);

      const [updatedCount] = await LeadActivity.update(
        { is_overdue: true },
        {
          where: {
            id: { [Op.in]: overdueIds }
          }
        }
      );

      affected = updatedCount;
      console.log(`⏰ ${affected} atividades marcadas como vencidas`);
    }

    return {
      processed: overdueActivities.length,
      affected,
      details: `${affected} atividades marcadas como vencidas`
    };
  }

  /**
   * Parar todos os jobs
   */
  stopAllJobs() {
    for (const [jobId, task] of this.scheduledTasks) {
      task.stop();
    }
    this.scheduledTasks.clear();
    this.runningJobs.clear();
    console.log('🛑 Todos os Cron Jobs foram parados');
  }

  /**
   * Recarregar jobs ativos
   */
  async reloadJobs() {
    this.stopAllJobs();
    await this.initialize();
  }
}

module.exports = new CronJobService();
