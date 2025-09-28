const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const LeadContact = sequelize.define('LeadContact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Lead',
      key: 'id'
    }
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Account',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('phone', 'email'),
    allowNull: false
  },
  label: {
    type: DataTypes.ENUM(
      'primary', 'secondary', 'work', 'personal',
      'mobile', 'home', 'whatsapp', 'commercial'
    ),
    allowNull: false,
    defaultValue: 'primary'
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidContact(value) {
        if (this.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Email deve ter um formato válido');
          }
        } else if (this.type === 'phone') {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(value)) {
            throw new Error('Telefone deve conter apenas números e caracteres válidos');
          }
        }
      }
    }
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'lead_contacts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_lead_contacts_lead',
      fields: ['lead_id']
    },
    {
      name: 'idx_lead_contacts_account',
      fields: ['account_id']
    },
    {
      name: 'idx_lead_contacts_type_value',
      fields: ['type', 'value']
    },
    {
      name: 'idx_lead_contacts_primary',
      fields: ['lead_id', 'is_primary', 'type']
    }
  ],
  hooks: {
    beforeSave: async (contact, options) => {
      // Ensure only one primary contact per type per lead
      if (contact.is_primary) {
        await LeadContact.update(
          { is_primary: false },
          {
            where: {
              lead_id: contact.lead_id,
              type: contact.type,
              id: { [require('sequelize').Op.ne]: contact.id }
            },
            transaction: options.transaction
          }
        );
      }
    }
  }
});

module.exports = LeadContact;