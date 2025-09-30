'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Determinar nome correto das tabelas
    const tables = await queryInterface.showAllTables();
    const leadsTable = tables.includes('Lead') ? 'Lead' : 'leads';
    const accountsTable = tables.includes('Account') ? 'Account' : 'accounts';

    await queryInterface.createTable('lead_files', {
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
      uploaded_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Generated filename for storage'
      },
      original_filename: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Original filename from user'
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Full path to file in storage'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 10 * 1024 * 1024 // 10MB max
        }
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_type: {
        type: Sequelize.ENUM('image', 'document', 'spreadsheet', 'presentation', 'pdf', 'text', 'other'),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether other users in the account can access this file'
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'File version for future versioning support'
      },
      virus_scan_status: {
        type: Sequelize.ENUM('pending', 'clean', 'infected', 'error'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Virus scan status for security'
      },
      virus_scan_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      download_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      last_downloaded_at: {
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
    await queryInterface.addIndex('lead_files',
      ['lead_id', 'created_at'],
      { name: 'idx_lead_files_lead' }
    );

    await queryInterface.addIndex('lead_files',
      ['account_id', 'created_at'],
      { name: 'idx_lead_files_account' }
    );

    await queryInterface.addIndex('lead_files',
      ['uploaded_by_user_id'],
      { name: 'idx_lead_files_uploader' }
    );

    await queryInterface.addIndex('lead_files',
      ['file_type'],
      { name: 'idx_lead_files_type' }
    );

    await queryInterface.addIndex('lead_files',
      ['file_size'],
      { name: 'idx_lead_files_size' }
    );

    await queryInterface.addIndex('lead_files',
      ['virus_scan_status'],
      { name: 'idx_lead_files_virus_status' }
    );

    await queryInterface.addIndex('lead_files',
      ['is_public'],
      { name: 'idx_lead_files_public' }
    );

    // Add constraint to ensure filename uniqueness per lead
    await queryInterface.addConstraint('lead_files', {
      fields: ['lead_id', 'filename'],
      type: 'unique',
      name: 'unique_lead_file_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_lead');
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_account');
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_uploader');
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_type');
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_size');
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_virus_status');
    await queryInterface.removeIndex('lead_files', 'idx_lead_files_public');

    // Remove constraint
    await queryInterface.removeConstraint('lead_files', 'unique_lead_file_name');

    // Remove ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_files_file_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_files_virus_scan_status";');

    // Remove table
    await queryInterface.dropTable('lead_files');
  }
};