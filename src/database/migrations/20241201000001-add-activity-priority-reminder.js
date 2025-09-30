'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add priority column
    await queryInterface.addColumn('lead_activities', 'priority', {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      allowNull: false
    });

    // Add reminder_at column
    await queryInterface.addColumn('lead_activities', 'reminder_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add is_overdue computed column helper
    await queryInterface.addColumn('lead_activities', 'is_overdue', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add indexes for better performance on activity queries
    await queryInterface.addIndex('lead_activities', {
      name: 'idx_lead_activities_priority',
      fields: ['priority']
    });

    await queryInterface.addIndex('lead_activities', {
      name: 'idx_lead_activities_reminder',
      fields: ['reminder_at']
    });

    await queryInterface.addIndex('lead_activities', {
      name: 'idx_lead_activities_overdue',
      fields: ['is_overdue', 'status']
    });

    // Index for pending activities by user (for notifications)
    await queryInterface.addIndex('lead_activities', {
      name: 'idx_lead_activities_user_pending',
      fields: ['user_id', 'status', 'scheduled_for']
    });

    // Index for today's activities
    await queryInterface.addIndex('lead_activities', {
      name: 'idx_lead_activities_scheduled',
      fields: ['scheduled_for', 'status']
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('lead_activities', 'idx_lead_activities_priority');
    await queryInterface.removeIndex('lead_activities', 'idx_lead_activities_reminder');
    await queryInterface.removeIndex('lead_activities', 'idx_lead_activities_overdue');
    await queryInterface.removeIndex('lead_activities', 'idx_lead_activities_user_pending');
    await queryInterface.removeIndex('lead_activities', 'idx_lead_activities_scheduled');

    // Remove columns
    await queryInterface.removeColumn('lead_activities', 'priority');
    await queryInterface.removeColumn('lead_activities', 'reminder_at');
    await queryInterface.removeColumn('lead_activities', 'is_overdue');
  }
};