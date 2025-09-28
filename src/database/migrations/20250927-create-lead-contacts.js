'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
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

    // Performance indexes
    await queryInterface.addIndex('lead_contacts',
      ['lead_id'],
      { name: 'idx_lead_contacts_lead' }
    );

    await queryInterface.addIndex('lead_contacts',
      ['account_id'],
      { name: 'idx_lead_contacts_account' }
    );

    await queryInterface.addIndex('lead_contacts',
      ['type', 'value'],
      { name: 'idx_lead_contacts_type_value' }
    );

    await queryInterface.addIndex('lead_contacts',
      ['lead_id', 'is_primary', 'type'],
      { name: 'idx_lead_contacts_primary' }
    );

    // Unique constraint to prevent duplicate contacts
    await queryInterface.addConstraint('lead_contacts', {
      fields: ['lead_id', 'type', 'value'],
      type: 'unique',
      name: 'unique_lead_contact_value'
    });
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