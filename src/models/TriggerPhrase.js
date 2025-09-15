const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const TriggerPhrase = sequelize.define('TriggerPhrase', {
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
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id'
    }
  },
  phrase: {
    type: DataTypes.STRING,
    allowNull: false
  },
  creative_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Código criativo da frase gatilho (opcional)'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  match_type: {
    type: DataTypes.ENUM('exact', 'keyword', 'fuzzy', 'contains', 'starts_with', 'ends_with', 'regex'),
    defaultValue: 'contains'
  },
  case_sensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  min_confidence: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.5
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Estatísticas
  total_matches: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_matched_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Metadados
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'trigger_phrases',
  indexes: [
    {
      fields: ['account_id']
    },
    {
      fields: ['campaign_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['phrase']
    }
  ]
});

module.exports = TriggerPhrase;