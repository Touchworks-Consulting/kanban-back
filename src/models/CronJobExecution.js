const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const CronJobExecution = sequelize.define('CronJobExecution', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cron_job_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'CronJob',
      key: 'id'
    }
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  finished_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('running', 'completed', 'failed', 'timeout'),
    defaultValue: 'running'
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duração da execução em milissegundos'
  },
  processed_items: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Número de itens processados'
  },
  affected_items: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Número de itens afetados/modificados'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  output_data: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Dados de saída/resultado da execução'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Metadados adicionais da execução'
  }
});

module.exports = CronJobExecution;
