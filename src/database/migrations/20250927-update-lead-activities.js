'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update ENUM to include new activity types
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_lead_activities_activity_type"
      ADD VALUE IF NOT EXISTS 'status_change';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_lead_activities_activity_type"
      ADD VALUE IF NOT EXISTS 'contact_added';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_lead_activities_activity_type"
      ADD VALUE IF NOT EXISTS 'file_uploaded';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_lead_activities_activity_type"
      ADD VALUE IF NOT EXISTS 'lead_created';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_lead_activities_activity_type"
      ADD VALUE IF NOT EXISTS 'lead_updated';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_lead_activities_activity_type"
      ADD VALUE IF NOT EXISTS 'column_moved';
    `);

    // Allow user_id to be null for system-generated activities
    await queryInterface.changeColumn('lead_activities', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add compound index for optimal performance
    await queryInterface.addIndex('lead_activities',
      ['account_id', 'lead_id', 'created_at'],
      {
        name: 'idx_lead_activities_compound_optimized',
        concurrently: true
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove compound index
    await queryInterface.removeIndex('lead_activities', 'idx_lead_activities_compound_optimized');

    // Revert user_id to NOT NULL
    await queryInterface.changeColumn('lead_activities', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Note: Cannot easily remove ENUM values in PostgreSQL without recreating the type
    // This would require dropping the column, recreating the ENUM, and adding the column back
    // For safety, we'll leave the new ENUM values in place
  }
};