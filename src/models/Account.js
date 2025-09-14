const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');
const bcrypt = require('bcrypt');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  api_key: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  display_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  plan: {
    type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
    defaultValue: 'free'
  },
  custom_statuses: {
    type: DataTypes.JSON,
    defaultValue: [
      { id: 'new', name: 'Novo', color: '#94a3b8', order: 1, is_initial: true, is_won: false, is_lost: false },
      { id: 'contacted', name: 'Contactado', color: '#3b82f6', order: 2, is_initial: false, is_won: false, is_lost: false },
      { id: 'qualified', name: 'Qualificado', color: '#f59e0b', order: 3, is_initial: false, is_won: false, is_lost: false },
      { id: 'proposal', name: 'Proposta', color: '#8b5cf6', order: 4, is_initial: false, is_won: false, is_lost: false },
      { id: 'won', name: 'Ganho', color: '#10b981', order: 5, is_initial: false, is_won: true, is_lost: false },
      { id: 'lost', name: 'Perdido', color: '#ef4444', order: 6, is_initial: false, is_won: false, is_lost: true }
    ]
  },
  custom_loss_reasons: {
    type: DataTypes.JSON,
    defaultValue: [
      { id: 'price', name: 'Preço alto' },
      { id: 'timing', name: 'Timing inadequado' },
      { id: 'competitor', name: 'Escolheu concorrente' },
      { id: 'no_response', name: 'Não respondeu' },
      { id: 'not_interested', name: 'Não interessado' },
      { id: 'other', name: 'Outro motivo' }
    ]
  }
}, {
  hooks: {
    beforeCreate: async (account) => {
      if (account.password) {
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(account.password, salt);
      }
    },
    beforeUpdate: async (account) => {
      if (account.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(account.password, salt);
      }
    }
  }
});

Account.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = Account;
