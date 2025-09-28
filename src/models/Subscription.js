const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Subscription = sequelize.define('Subscription', {
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
    },
    comment: 'Conta que possui a assinatura'
  },
  plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'plans',
      key: 'id'
    },
    comment: 'Plano contratado'
  },
  status: {
    type: DataTypes.ENUM(
      'trial',         // Período de teste
      'active',        // Ativo e pagando
      'past_due',      // Atrasado no pagamento
      'canceled',      // Cancelado pelo usuário
      'unpaid',        // Não pago
      'incomplete',    // Pagamento incompleto
      'paused'         // Pausado temporariamente
    ),
    allowNull: false,
    defaultValue: 'trial',
    comment: 'Status atual da assinatura'
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'ID da assinatura no Stripe'
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do cliente no Stripe'
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Início do período atual de cobrança'
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Fim do período atual de cobrança'
  },
  trial_start: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Início do período de trial'
  },
  trial_end: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fim do período de trial'
  },
  canceled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data de cancelamento da assinatura'
  },
  cancel_at_period_end: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se deve cancelar no fim do período atual'
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Quantidade de usuários na assinatura'
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Preço por usuário/mês no momento da contratação'
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Preço total mensal (quantity * unit_price)'
  },
  next_invoice_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data da próxima cobrança'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Metadados adicionais da assinatura'
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    {
      fields: ['account_id']
    },
    {
      fields: ['plan_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['stripe_subscription_id'],
      where: {
        stripe_subscription_id: {
          [require('sequelize').Op.ne]: null
        }
      }
    },
    {
      fields: ['current_period_end']
    }
  ],
  hooks: {
    beforeUpdate: (subscription) => {
      // Recalcula o preço total baseado na quantidade
      if (subscription.changed('quantity') || subscription.changed('unit_price')) {
        subscription.total_price = subscription.quantity * subscription.unit_price;
      }
    },
    beforeCreate: (subscription) => {
      // Define o preço total na criação
      subscription.total_price = subscription.quantity * subscription.unit_price;
    }
  }
});

module.exports = Subscription;