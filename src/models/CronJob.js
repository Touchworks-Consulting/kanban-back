const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const CronJob = sequelize.define('CronJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Account',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM(
      'lead_assignment',      // Atribuir leads automaticamente
      'status_update',        // Atualizar status de leads
      'email_notification',   // Enviar notificações por email
      'report_generation',    // Gerar relatórios
      'data_cleanup',         // Limpeza de dados antigos
      'webhook_retry',        // Retentar webhooks falhados
      'lead_scoring',         // Calcular score de leads
      'follow_up_reminder',   // Lembretes de follow-up
      'activity_overdue',     // Marcar atividades vencidas
      'custom_automation'     // Automação personalizada
    ),
    allowNull: false
  },
  cron_expression: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Expressão cron no formato: minuto hora dia mês dia_da_semana'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  conditions: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Condições para execução do job'
  },
  actions: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Ações a serem executadas'
  },
  last_run_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  next_run_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  run_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  success_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timeout_seconds: {
    type: DataTypes.INTEGER,
    defaultValue: 300, // 5 minutos
    comment: 'Timeout em segundos para execução do job'
  },
  max_retries: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = CronJob;
