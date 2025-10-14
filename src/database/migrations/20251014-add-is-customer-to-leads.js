'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('Lead');

      if (!tableDescription.is_customer) {
        // Adicionar campo is_customer na tabela Lead
        await queryInterface.addColumn('Lead', 'is_customer', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Marca se o lead já é cliente - usado para excluir de relatórios e métricas de conversão'
        });
        console.log('✅ Campo is_customer adicionado à tabela Lead');
      } else {
        console.log('⚠️ Coluna is_customer já existe na tabela Lead');
      }

      // Adicionar índice para filtragem rápida
      try {
        await queryInterface.addIndex('Lead', ['is_customer'], {
          name: 'idx_leads_is_customer'
        });
        console.log('✅ Índice idx_leads_is_customer criado');
      } catch (error) {
        console.log('⚠️ Índice idx_leads_is_customer já existe ou erro ao criar:', error.message);
      }
    } catch (error) {
      console.error('❌ Erro na migration add-is-customer-to-leads:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      // Remover índice
      await queryInterface.removeIndex('Lead', 'idx_leads_is_customer');
      console.log('❌ Índice idx_leads_is_customer removido');
    } catch (error) {
      console.log('⚠️ Erro ao remover índice idx_leads_is_customer:', error.message);
    }

    // Remover coluna
    await queryInterface.removeColumn('Lead', 'is_customer');
    console.log('❌ Campo is_customer removido da tabela Lead');
  }
};
