const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Feedback = sequelize.define('Feedback', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('bug', 'suggestion', 'praise'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Informações do usuário
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    account_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Accounts',
        key: 'id'
      }
    },
    account_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Informações técnicas automáticas
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    screen_resolution: {
      type: DataTypes.STRING,
      allowNull: true
    },
    browser_info: {
      type: DataTypes.JSON,
      allowNull: true
    },
    current_page: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Metadados
    status: {
      type: DataTypes.ENUM('new', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'new'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'feedbacks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

module.exports = Feedback;