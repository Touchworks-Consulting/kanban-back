'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableDescription = await queryInterface.describeTable('lead_activities');

      // Add priority column
      if (!tableDescription.priority) {
        await queryInterface.addColumn('lead_activities', 'priority', {
          type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
          defaultValue: 'medium',
          allowNull: false
        });
      }

      // Add reminder_at column
      if (!tableDescription.reminder_at) {
        await queryInterface.addColumn('lead_activities', 'reminder_at', {
          type: Sequelize.DATE,
          allowNull: true
        });
      }

      // Add is_overdue computed column helper
      if (!tableDescription.is_overdue) {
        await queryInterface.addColumn('lead_activities', 'is_overdue', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        });
      }

      // Add indexes for better performance on activity queries
      const addIndexSafely = async (indexName, fields) => {
        try {
          await queryInterface.addIndex('lead_activities', {
            name: indexName,
            fields: fields
          });
        } catch (error) {
          console.log(`Índice ${indexName} já existe ou erro ao criar:`, error.message);
        }
      };

      await addIndexSafely('idx_lead_activities_priority', ['priority']);
      await addIndexSafely('idx_lead_activities_reminder', ['reminder_at']);
      await addIndexSafely('idx_lead_activities_overdue', ['is_overdue', 'status']);
      await addIndexSafely('idx_lead_activities_user_pending', ['user_id', 'status', 'scheduled_for']);
      await addIndexSafely('idx_lead_activities_scheduled', ['scheduled_for', 'status']);
    } catch (error) {
      console.error('Erro na migration add-activity-priority-reminder:', error);
      throw error;
    }
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