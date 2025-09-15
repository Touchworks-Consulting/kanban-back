const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const LeadHistory = sequelize.define('LeadHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Lead',
      key: 'id'
    }
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Account',
      key: 'id'
    }
  },
  from_column_id: {
    type: DataTypes.UUID,
    allowNull: true, // null quando é a primeira entrada (lead criado)
    references: {
      model: 'KanbanColumn',
      key: 'id'
    }
  },
  to_column_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'KanbanColumn',
      key: 'id'
    }
  },
  moved_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  action_type: {
    type: DataTypes.ENUM('created', 'moved', 'status_changed'),
    defaultValue: 'moved'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {} // Para armazenar informações extras como status anterior/novo
  }
}, {
  tableName: 'lead_histories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['lead_id', 'moved_at']
    },
    {
      fields: ['account_id', 'moved_at']
    },
    {
      fields: ['to_column_id', 'moved_at']
    }
  ]
});

module.exports = LeadHistory;