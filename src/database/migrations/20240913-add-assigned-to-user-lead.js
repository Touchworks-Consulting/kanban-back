'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('Lead');

      if (!tableDescription.assigned_to_user_id) {
        // Adicionar campo assigned_to_user_id na tabela Lead
        await queryInterface.addColumn('Lead', 'assigned_to_user_id', {
          type: Sequelize.UUID,
          allowNull: true, // Permite null para leads não atribuídos
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL' // Se usuário for deletado, lead fica sem atribuição
        });
      } else {
        console.log('Coluna assigned_to_user_id já existe na tabela Lead');
      }

      // Adicionar índices (tentativa segura)
      try {
        await queryInterface.addIndex('Lead', ['assigned_to_user_id']);
      } catch (error) {
        console.log('Índice assigned_to_user_id já existe ou erro ao criar:', error.message);
      }

      try {
        await queryInterface.addIndex('Lead', ['account_id', 'assigned_to_user_id']);
      } catch (error) {
        console.log('Índice account_id+assigned_to_user_id já existe ou erro ao criar:', error.message);
      }
    } catch (error) {
      console.error('Erro na migration add-assigned-to-user-lead:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('Lead', ['assigned_to_user_id']);
    await queryInterface.removeIndex('Lead', ['account_id', 'assigned_to_user_id']);

    // Remover coluna
    await queryInterface.removeColumn('Lead', 'assigned_to_user_id');
  }
};