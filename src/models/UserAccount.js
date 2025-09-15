const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const UserAccount = sequelize.define('UserAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    defaultValue: 'member',
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'user_accounts',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'account_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['account_id']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = UserAccount;