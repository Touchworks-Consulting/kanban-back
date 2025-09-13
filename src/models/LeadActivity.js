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
    allowNull: false
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  activity_type: {
    type: DataTypes.ENUM('call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'follow_up'),
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
  tableName: 'lead_activities'
});

module.exports = LeadActivity;