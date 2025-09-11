const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const WhatsAppAccount = sequelize.define('WhatsAppAccount', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { type: DataTypes.UUID, allowNull: false },
  phone_id: { type: DataTypes.STRING, allowNull: false, unique: true },
  account_name: { type: DataTypes.STRING, allowNull: false },
  phone_number: { type: DataTypes.STRING, allowNull: false },
  webhook_url: { type: DataTypes.STRING, allowNull: true },
  verify_token: { type: DataTypes.STRING, allowNull: true },
  access_token: { type: DataTypes.STRING, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'whatsapp_accounts' });

module.exports = WhatsAppAccount;
