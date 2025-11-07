'use strict';

/**
 * Migration: Add Performance Indexes to Lead and LeadHistory tables
 *
 * Problem: Queries were extremely slow with 1000+ leads due to missing indexes
 * Solution: Add composite indexes on frequently queried columns
 *
 * Expected Impact: 10-50x faster queries
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Adding performance indexes to Lead table...');

    // Lead table indexes
    await queryInterface.addIndex('Lead', ['account_id'], {
      name: 'idx_lead_account_id'
    });

    await queryInterface.addIndex('Lead', ['status'], {
      name: 'idx_lead_status'
    });

    await queryInterface.addIndex('Lead', ['column_id'], {
      name: 'idx_lead_column_id'
    });

    await queryInterface.addIndex('Lead', ['created_at'], {
      name: 'idx_lead_created_at'
    });

    // Composite indexes for common query patterns
    await queryInterface.addIndex('Lead', ['account_id', 'status'], {
      name: 'idx_lead_account_status'
    });

    await queryInterface.addIndex('Lead', ['account_id', 'column_id'], {
      name: 'idx_lead_account_column'
    });

    await queryInterface.addIndex('Lead', ['account_id', 'created_at'], {
      name: 'idx_lead_account_created'
    });

    await queryInterface.addIndex('Lead', ['account_id', 'is_customer', 'created_at'], {
      name: 'idx_lead_account_customer_created'
    });

    console.log('✅ Lead table indexes created');

    // LeadHistory table indexes
    console.log('🚀 Adding performance indexes to LeadHistory table...');

    await queryInterface.addIndex('LeadHistory', ['lead_id', 'to_column_id', 'moved_at'], {
      name: 'idx_lead_history_lead_to_moved'
    });

    await queryInterface.addIndex('LeadHistory', ['from_column_id', 'moved_at'], {
      name: 'idx_lead_history_from_moved'
    });

    console.log('✅ LeadHistory table indexes created');
    console.log('🎉 All performance indexes added successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️ Removing performance indexes from Lead table...');

    // Remove Lead indexes
    await queryInterface.removeIndex('Lead', 'idx_lead_account_id');
    await queryInterface.removeIndex('Lead', 'idx_lead_status');
    await queryInterface.removeIndex('Lead', 'idx_lead_column_id');
    await queryInterface.removeIndex('Lead', 'idx_lead_created_at');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_status');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_column');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_created');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_customer_created');

    console.log('✅ Lead table indexes removed');

    // Remove LeadHistory indexes
    console.log('🗑️ Removing performance indexes from LeadHistory table...');

    await queryInterface.removeIndex('LeadHistory', 'idx_lead_history_lead_to_moved');
    await queryInterface.removeIndex('LeadHistory', 'idx_lead_history_from_moved');

    console.log('✅ LeadHistory table indexes removed');
    console.log('✅ All indexes removed successfully');
  }
};
