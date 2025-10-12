'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('Account');

      if (!tableDescription.phone) {
        // Adicionar campo phone na tabela Account
        await queryInterface.addColumn('Account', 'phone', {
          type: Sequelize.STRING,
          allowNull: true, // Começar como opcional para não quebrar dados existentes
          unique: false
        });
      } else {
        console.log('Coluna phone já existe na tabela Account');
      }

      // Adicionar índice para busca rápida (tentativa segura)
      try {
        await queryInterface.addIndex('Account', ['phone'], {
          name: 'idx_account_phone'
        });
      } catch (error) {
        console.log('Índice idx_account_phone já existe ou erro ao criar:', error.message);
      }
    } catch (error) {
      console.error('Erro na migration add-phone-to-accounts:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      // Remover índice
      await queryInterface.removeIndex('Account', 'idx_account_phone');
    } catch (error) {
      console.log('Erro ao remover índice idx_account_phone:', error.message);
    }

    // Remover coluna
    await queryInterface.removeColumn('Account', 'phone');
  }
};