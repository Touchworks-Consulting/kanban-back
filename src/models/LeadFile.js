const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const LeadFile = sequelize.define('LeadFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Lead',
      key: 'id'
    }
  },
  uploaded_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Account',
      key: 'id'
    }
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Generated filename for storage'
  },
  original_filename: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Original filename from user'
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Full path to file in storage'
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10 * 1024 * 1024 // 10MB max
    }
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ]]
    }
  },
  file_type: {
    type: DataTypes.ENUM('image', 'document', 'spreadsheet', 'presentation', 'pdf', 'text', 'other'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether other users in the account can access this file'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'File version for future versioning support'
  },
  virus_scan_status: {
    type: DataTypes.ENUM('pending', 'clean', 'infected', 'error'),
    defaultValue: 'pending',
    comment: 'Virus scan status for security'
  },
  virus_scan_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_downloaded_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'lead_files',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_lead_files_lead',
      fields: ['lead_id', 'created_at']
    },
    {
      name: 'idx_lead_files_account',
      fields: ['account_id', 'created_at']
    },
    {
      name: 'idx_lead_files_uploader',
      fields: ['uploaded_by_user_id']
    },
    {
      name: 'idx_lead_files_type',
      fields: ['file_type']
    },
    {
      name: 'idx_lead_files_size',
      fields: ['file_size']
    }
  ],
  hooks: {
    beforeDestroy: async (file, options) => {
      // TODO: Implement file deletion from storage
      // This hook will be used to clean up actual files when records are deleted
      console.log(`TODO: Delete file from storage: ${file.file_path}`);
    }
  }
});

module.exports = LeadFile;