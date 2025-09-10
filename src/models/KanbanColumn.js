const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const KanbanColumn = sequelize.define('KanbanColumn', {
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
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#6b7280' // neutral gray
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // true for "Leads Entrantes" column
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = KanbanColumn;
