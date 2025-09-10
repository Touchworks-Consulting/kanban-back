const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const LeadTag = sequelize.define('LeadTag', {
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Lead',
      key: 'id'
    }
  },
  tag_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tag',
      key: 'id'
    }
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['lead_id', 'tag_id']
    }
  ]
});

module.exports = LeadTag;
