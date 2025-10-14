'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Determinar nome correto da tabela de leads
      const tables = await queryInterface.showAllTables();
      const leadsTable = tables.includes('Lead') ? 'Lead' : 'leads';
      const accountsTable = tables.includes('Account') ? 'Account' : 'accounts';

      // Verificar se a tabela já existe
      if (tables.includes('lead_contacts')) {
        console.log('⚠️ Tabela lead_contacts já existe, pulando criação');
      } else {
        await queryInterface.createTable('lead_contacts', {
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
          model: leadsTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: accountsTable,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('phone', 'email'),
        allowNull: false
      },
      label: {
        type: Sequelize.ENUM(
          'primary', 'secondary', 'work', 'personal',
          'mobile', 'home', 'whatsapp', 'commercial'
        ),
        allowNull: false,
        defaultValue: 'primary'
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      verified_at: {
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
      }

      // Performance indexes - adicionar de forma segura
      const addIndexSafely = async (fields, name) => {
        try {
          await queryInterface.addIndex('lead_contacts', fields, { name });
        } catch (error) {
          console.log(`⚠️ Índice ${name} já existe:`, error.message);
        }
      };

      await addIndexSafely(['lead_id'], 'idx_lead_contacts_lead');
      await addIndexSafely(['account_id'], 'idx_lead_contacts_account');
      await addIndexSafely(['type', 'value'], 'idx_lead_contacts_type_value');
      await addIndexSafely(['lead_id', 'is_primary', 'type'], 'idx_lead_contacts_primary');

      // Unique constraint to prevent duplicate contacts
      try {
        await queryInterface.addConstraint('lead_contacts', {
          fields: ['lead_id', 'type', 'value'],
          type: 'unique',
          name: 'unique_lead_contact_value'
        });
      } catch (error) {
        console.log('⚠️ Constraint unique_lead_contact_value já existe:', error.message);
      }
    } catch (error) {
      console.error('Erro na migration create-lead-contacts:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('lead_contacts', 'idx_lead_contacts_lead');
    await queryInterface.removeIndex('lead_contacts', 'idx_lead_contacts_account');
    await queryInterface.removeIndex('lead_contacts', 'idx_lead_contacts_type_value');
    await queryInterface.removeIndex('lead_contacts', 'idx_lead_contacts_primary');

    // Remove constraint
    await queryInterface.removeConstraint('lead_contacts', 'unique_lead_contact_value');

    // Remove ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_contacts_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_contacts_label";');

    // Remove table
    await queryInterface.dropTable('lead_contacts');
  }
};