const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../database/connection');

const Campaign = sequelize.define('Campaign', {
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
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Meta, Google, TikTok, etc.'
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Instagram, Facebook, Google Ads, YouTube, etc.'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Orçamento da campanha'
  },
  target_audience: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Dados do público-alvo'
  },
  campaign_settings: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Configurações específicas da campanha'
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Métricas
  total_leads: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cache do total de leads'
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Custo total gasto'
  },
  cost_per_lead: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Custo por lead calculado'
  }
}, {
  tableName: 'campaigns',
  indexes: [
    {
      fields: ['account_id']
    },
    {
      fields: ['platform', 'channel']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Campaign;