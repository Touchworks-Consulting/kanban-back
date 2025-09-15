const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Automation = sequelize.define('Automation', {
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
  trigger_type: {
    type: DataTypes.ENUM(
      'lead_created',         // Quando lead é criado
      'status_changed',       // Quando status muda
      'time_based',          // Baseado em tempo
      'tag_added',           // Quando tag é adicionada
      'column_moved',        // Quando lead muda de coluna
      'webhook_received',    // Quando webhook é recebido
      'manual_trigger'       // Trigger manual
    ),
    allowNull: false
  },
  trigger_conditions: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Condições para disparar a automação'
  },
  actions: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Lista de ações a serem executadas'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Prioridade de execução (maior número = maior prioridade)'
  },
  execution_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_executed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delay_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Atraso em minutos antes de executar'
  }
});

module.exports = Automation;
