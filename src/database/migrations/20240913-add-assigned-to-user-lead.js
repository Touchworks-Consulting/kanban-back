'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campo assigned_to_user_id na tabela leads
    await queryInterface.addColumn('leads', 'assigned_to_user_id', {
      type: Sequelize.UUID,
      allowNull: true, // Permite null para leads não atribuídos
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // Se usuário for deletado, lead fica sem atribuição
    });

    // Adicionar índice para melhorar performance das consultas
    await queryInterface.addIndex('leads', ['assigned_to_user_id']);
    await queryInterface.addIndex('leads', ['account_id', 'assigned_to_user_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('leads', ['assigned_to_user_id']);
    await queryInterface.removeIndex('leads', ['account_id', 'assigned_to_user_id']);

    // Remover coluna
    await queryInterface.removeColumn('leads', 'assigned_to_user_id');
  }
};