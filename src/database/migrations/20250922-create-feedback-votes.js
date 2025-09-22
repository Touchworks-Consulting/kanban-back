'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('feedback_votes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      feedback_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'feedbacks',
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
        onDelete: 'CASCADE'
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice único para votos de usuários autenticados
    await queryInterface.addIndex('feedback_votes', ['feedback_id', 'user_id'], {
      name: 'unique_feedback_user_vote',
      unique: true,
      where: {
        user_id: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    // Índice único para votos por IP (usuários anônimos)
    await queryInterface.addIndex('feedback_votes', ['feedback_id', 'ip_address'], {
      name: 'unique_feedback_ip_vote',
      unique: true,
      where: {
        user_id: null,
        ip_address: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('feedback_votes');
  }
};