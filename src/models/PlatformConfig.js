const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const PlatformConfig = sequelize.define('PlatformConfig', {
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
  phrase: {
    type: DataTypes.STRING,
    allowNull: false
  },
  campaign: {
    type: DataTypes.STRING,
    allowNull: false
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = PlatformConfig;
