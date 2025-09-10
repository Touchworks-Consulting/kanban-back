const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Lead = sequelize.define('Lead', {
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
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: true // facebook, instagram, google, etc.
  },
  campaign: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'),
    defaultValue: 'new'
  },
  column_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'KanbanColumn',
      key: 'id'
    }
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  won_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lost_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
});

module.exports = Lead;
