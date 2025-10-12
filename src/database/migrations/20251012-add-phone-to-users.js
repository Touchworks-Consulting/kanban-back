'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('users');

      if (!tableDescription.phone) {
        // Adicionar campo phone na tabela users
        await queryInterface.addColumn('users', 'phone', {
          type: Sequelize.STRING,
          allowNull: true, // Começar como opcional
          unique: false
        });
      } else {
        console.log('Coluna phone já existe na tabela users');
      }

      // Adicionar índice para busca rápida (tentativa segura)
      try {
        await queryInterface.addIndex('users', ['phone'], {
          name: 'idx_user_phone'
        });
      } catch (error) {
        console.log('Índice idx_user_phone já existe ou erro ao criar:', error.message);
      }
    } catch (error) {
      console.error('Erro na migration add-phone-to-users:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      // Remover índice
      await queryInterface.removeIndex('users', 'idx_user_phone');
    } catch (error) {
      console.log('Erro ao remover índice idx_user_phone:', error.message);
    }

    // Remover coluna
    await queryInterface.removeColumn('users', 'phone');
  }
};