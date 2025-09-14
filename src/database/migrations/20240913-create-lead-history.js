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
          model: 'Lead',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Account',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      from_column_id: {
        type: Sequelize.UUID,
        allowNull: true, // null quando é a primeira entrada (lead criado)
        references: {
          model: 'KanbanColumn',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      to_column_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'KanbanColumn',
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

    // Adicionar índices para melhorar performance das consultas (com verificação de existência)
    const indexes = [
      { name: 'lead_histories_lead_id_moved_at', fields: ['lead_id', 'moved_at'] },
      { name: 'lead_histories_account_id_moved_at', fields: ['account_id', 'moved_at'] },
      { name: 'lead_histories_to_column_id_moved_at', fields: ['to_column_id', 'moved_at'] },
      { name: 'lead_histories_from_column_id_moved_at', fields: ['from_column_id', 'moved_at'] },
      { name: 'lead_histories_action_type', fields: ['action_type'] }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('lead_histories', index.fields, { name: index.name });
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
        console.log(`Index ${index.name} already exists, skipping...`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices (com verificação de existência)
    const indexes = [
      'lead_histories_lead_id_moved_at',
      'lead_histories_account_id_moved_at',
      'lead_histories_to_column_id_moved_at',
      'lead_histories_from_column_id_moved_at',
      'lead_histories_action_type'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('lead_histories', indexName);
      } catch (error) {
        if (!error.message.includes('does not exist')) {
          throw error;
        }
        console.log(`Index ${indexName} doesn't exist, skipping...`);
      }
    }

    // Remover ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_histories_action_type";');

    // Remover tabela
    await queryInterface.dropTable('lead_histories');
  }
};