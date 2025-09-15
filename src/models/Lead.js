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
      isValidEmail(value) {
        if (value && value.trim() !== '') {
          // Só aplica validação de email se não for vazio
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Email deve ter um formato válido');
          }
        }
      }
    }
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: true // facebook, instagram, google, etc.
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: true // WhatsApp, Email, SMS, etc.
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
  assigned_to_user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  won_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  won_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lost_reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lost_at: {
    type: DataTypes.DATE,
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
