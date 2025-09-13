'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lead_histories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
      from_column_id: {
        type: Sequelize.UUID,
        allowNull: true, // null quando é a primeira entrada (lead criado)
        references: {
          model: 'kanban_columns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      to_column_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'kanban_columns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      moved_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      action_type: {
        type: Sequelize.ENUM('created', 'moved', 'status_changed'),
        defaultValue: 'moved',
        allowNull: false
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
    await queryInterface.addIndex('lead_histories', ['lead_id', 'moved_at']);
    await queryInterface.addIndex('lead_histories', ['account_id', 'moved_at']);
    await queryInterface.addIndex('lead_histories', ['to_column_id', 'moved_at']);
    await queryInterface.addIndex('lead_histories', ['from_column_id', 'moved_at']);
    await queryInterface.addIndex('lead_histories', ['action_type']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('lead_histories', ['lead_id', 'moved_at']);
    await queryInterface.removeIndex('lead_histories', ['account_id', 'moved_at']);
    await queryInterface.removeIndex('lead_histories', ['to_column_id', 'moved_at']);
    await queryInterface.removeIndex('lead_histories', ['from_column_id', 'moved_at']);
    await queryInterface.removeIndex('lead_histories', ['action_type']);

    // Remover ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_histories_action_type";');

    // Remover tabela
    await queryInterface.dropTable('lead_histories');
  }
};