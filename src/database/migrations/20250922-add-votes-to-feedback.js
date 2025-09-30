'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('feedbacks', 'votes', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
      console.log('⚠️ Coluna votes já existe em feedbacks');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('feedbacks', 'votes');
  }
};