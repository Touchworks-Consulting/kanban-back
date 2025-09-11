const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const WebhookLog = sequelize.define('WebhookLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { type: DataTypes.UUID, allowNull: false },
  phone_id: { type: DataTypes.STRING, allowNull: false },
  event_type: { type: DataTypes.STRING, allowNull: false },
  payload: { type: DataTypes.JSON, allowNull: false },
  processed: { type: DataTypes.BOOLEAN, defaultValue: false },
  campaign_matched: { type: DataTypes.STRING, allowNull: true },
  lead_created: { type: DataTypes.BOOLEAN, defaultValue: false },
  error: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'webhook_logs' });

module.exports = WebhookLog;
