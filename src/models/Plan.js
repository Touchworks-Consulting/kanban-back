const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome do plano (Starter, Professional, Enterprise)'
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Identificador único do plano para URLs'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição detalhada do plano'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Preço por usuário por mês em reais'
  },
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Máximo de usuários permitidos (null = ilimitado)'
  },
  max_leads: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Máximo de leads por mês (null = ilimitado)'
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Lista de features incluídas no plano'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Se o plano está disponível para contratação'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se é o plano padrão para novos usuários'
  },
  trial_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Dias de trial gratuito'
  },
  stripe_price_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do preço no Stripe'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Ordem de exibição dos planos'
  }
}, {
  tableName: 'plans',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      fields: ['is_active', 'sort_order']
    }
  ]
});

module.exports = Plan;