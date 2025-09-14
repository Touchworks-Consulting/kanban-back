'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se a tabela já existe
    try {
      const tableDescription = await queryInterface.describeTable('Notification');
      console.log('✅ Tabela Notification já existe, pulando criação...');
      return;
    } catch (error) {
      // Tabela não existe, prosseguir com criação
    }

    await queryInterface.createTable('notifications', {
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
          model: 'Account',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.ENUM('info', 'success', 'warning', 'error', 'system'),
        defaultValue: 'info',
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      action_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      action_label: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_dismissed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal',
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
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
      { name: 'notifications_account_id_created_at', fields: ['account_id', 'created_at'] },
      { name: 'notifications_user_id_created_at', fields: ['user_id', 'created_at'] },
      { name: 'notifications_type', fields: ['type'] },
      { name: 'notifications_priority', fields: ['priority'] },
      { name: 'notifications_is_read', fields: ['is_read'] },
      { name: 'notifications_is_dismissed', fields: ['is_dismissed'] },
      { name: 'notifications_expires_at', fields: ['expires_at'] },
      { name: 'notifications_composite', fields: ['account_id', 'is_read', 'is_dismissed', 'created_at'] }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('notifications', index.fields, { name: index.name });
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
      'notifications_account_id_created_at',
      'notifications_user_id_created_at',
      'notifications_type',
      'notifications_priority',
      'notifications_is_read',
      'notifications_is_dismissed',
      'notifications_expires_at',
      'notifications_composite'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('notifications', indexName);
      } catch (error) {
        if (!error.message.includes('does not exist')) {
          throw error;
        }
        console.log(`Index ${indexName} doesn't exist, skipping...`);
      }
    }

    // Remover ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_priority";');

    // Remover tabela
    await queryInterface.dropTable('notifications');
  }
};