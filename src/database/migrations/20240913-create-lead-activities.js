'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lead_activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'leads',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      activity_type: {
        type: Sequelize.ENUM('call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'follow_up'),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
        defaultValue: 'completed',
        allowNull: false
      },
      scheduled_for: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Adicionar índices para melhorar performance das consultas
    await queryInterface.addIndex('lead_activities', ['account_id', 'created_at']);
    await queryInterface.addIndex('lead_activities', ['lead_id', 'created_at']);
    await queryInterface.addIndex('lead_activities', ['user_id', 'created_at']);
    await queryInterface.addIndex('lead_activities', ['activity_type']);
    await queryInterface.addIndex('lead_activities', ['status']);
    await queryInterface.addIndex('lead_activities', ['completed_at']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('lead_activities', ['account_id', 'created_at']);
    await queryInterface.removeIndex('lead_activities', ['lead_id', 'created_at']);
    await queryInterface.removeIndex('lead_activities', ['user_id', 'created_at']);
    await queryInterface.removeIndex('lead_activities', ['activity_type']);
    await queryInterface.removeIndex('lead_activities', ['status']);
    await queryInterface.removeIndex('lead_activities', ['completed_at']);

    // Remover ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_activities_activity_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_activities_status";');

    // Remover tabela
    await queryInterface.dropTable('lead_activities');
  }
};