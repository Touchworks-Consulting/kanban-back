const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const AutomationExecution = sequelize.define('AutomationExecution', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  automation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Automation',
      key: 'id'
    }
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Lead',
      key: 'id'
    },
    comment: 'Lead relacionado à execução (se aplicável)'
  },
  trigger_data: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Dados que dispararam a automação'
  },
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Quando a automação deve ser executada'
  },
  executed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'skipped'),
    defaultValue: 'pending'
  },
  actions_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  actions_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  execution_result: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Resultado da execução das ações'
  }
});

module.exports = AutomationExecution;
