'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('KanbanColumn', 'is_mql', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica se esta coluna representa MQL (Marketing Qualified Lead)'
    });

    console.log('✅ Coluna is_mql adicionada à tabela KanbanColumn');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('KanbanColumn', 'is_mql');
    console.log('✅ Coluna is_mql removida da tabela KanbanColumn');
  }
};
