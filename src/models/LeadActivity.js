const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const LeadActivity = sequelize.define('LeadActivity', {
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
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Lead',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow system-generated activities
    references: {
      model: 'users',
      key: 'id'
    }
  },
  activity_type: {
    type: DataTypes.ENUM(
      'call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'follow_up',
      'status_change', 'contact_added', 'file_uploaded', 'lead_created',
      'lead_updated', 'column_moved'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'completed',
    allowNull: false
  },
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'lead_activities',
  timestamps: true,
  underscored: true,
  indexes: [
    // Critical performance indexes identified by code review
    {
      name: 'idx_lead_activities_timeline',
      fields: ['lead_id', 'created_at']
    },
    {
      name: 'idx_lead_activities_account',
      fields: ['account_id', 'created_at']
    },
    {
      name: 'idx_lead_activities_type',
      fields: ['activity_type']
    },
    {
      name: 'idx_lead_activities_compound',
      fields: ['account_id', 'lead_id', 'created_at']
    },
    {
      name: 'idx_lead_activities_user',
      fields: ['user_id', 'created_at']
    }
  ]
});

module.exports = LeadActivity;