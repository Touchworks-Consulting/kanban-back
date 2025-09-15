const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Tag = sequelize.define('Tag', {
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
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3b82f6' // blue
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Tag;
