const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const FeedbackVote = sequelize.define('FeedbackVote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    feedback_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'feedbacks',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true, // Permite votos anônimos
      references: {
        model: 'users',
        key: 'id'
      }
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true // Para controlar votos por IP quando não há usuário
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'feedback_votes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['feedback_id', 'user_id'],
        where: {
          user_id: {
            [sequelize.Sequelize.Op.not]: null
          }
        }
      },
      {
        unique: true,
        fields: ['feedback_id', 'ip_address'],
        where: {
          user_id: null,
          ip_address: {
            [sequelize.Sequelize.Op.not]: null
          }
        }
      }
    ]
  });

module.exports = FeedbackVote;