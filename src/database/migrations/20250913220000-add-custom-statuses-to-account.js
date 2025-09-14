'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se as colunas já existem antes de adicioná-las
    const tableInfo = await queryInterface.describeTable('Account');

    // Adicionar campo para custom statuses no Account
    if (!tableInfo.custom_statuses) {
      await queryInterface.addColumn('Account', 'custom_statuses', {
        type: Sequelize.JSON,
        defaultValue: [
          { id: 'new', name: 'Novo', color: '#94a3b8', order: 1, is_initial: true, is_won: false, is_lost: false },
          { id: 'contacted', name: 'Contactado', color: '#3b82f6', order: 2, is_initial: false, is_won: false, is_lost: false },
          { id: 'qualified', name: 'Qualificado', color: '#f59e0b', order: 3, is_initial: false, is_won: false, is_lost: false },
          { id: 'proposal', name: 'Proposta', color: '#8b5cf6', order: 4, is_initial: false, is_won: false, is_lost: false },
          { id: 'won', name: 'Ganho', color: '#10b981', order: 5, is_initial: false, is_won: true, is_lost: false },
          { id: 'lost', name: 'Perdido', color: '#ef4444', order: 6, is_initial: false, is_won: false, is_lost: true }
        ],
        allowNull: false
      });
      console.log('✅ Coluna custom_statuses adicionada');
    } else {
      console.log('ℹ️ Coluna custom_statuses já existe, pulando...');
    }

    // Adicionar campo para loss reasons customizados no Account
    if (!tableInfo.custom_loss_reasons) {
      await queryInterface.addColumn('Account', 'custom_loss_reasons', {
        type: Sequelize.JSON,
        defaultValue: [
          { id: 'price', name: 'Preço alto' },
          { id: 'timing', name: 'Timing inadequado' },
          { id: 'competitor', name: 'Escolheu concorrente' },
          { id: 'no_response', name: 'Não respondeu' },
          { id: 'not_interested', name: 'Não interessado' },
          { id: 'other', name: 'Outro motivo' }
        ],
        allowNull: false
      });
      console.log('✅ Coluna custom_loss_reasons adicionada');
    } else {
      console.log('ℹ️ Coluna custom_loss_reasons já existe, pulando...');
    }

    // Adicionar índice para melhorar performance (com verificação de existência)
    try {
      await queryInterface.addIndex('Account', ['custom_statuses'], {
        using: 'gin',
        name: 'account_custom_statuses_gin_idx'
      });
      console.log('✅ Índice GIN para custom_statuses adicionado');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('ℹ️ Índice GIN para custom_statuses já existe, pulando...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índice (com verificação de existência)
    try {
      await queryInterface.removeIndex('Account', 'account_custom_statuses_gin_idx');
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
      console.log('ℹ️ Índice account_custom_statuses_gin_idx não existe, pulando...');
    }

    // Verificar se as colunas existem antes de removê-las
    const tableInfo = await queryInterface.describeTable('Account');

    // Remover colunas
    if (tableInfo.custom_loss_reasons) {
      await queryInterface.removeColumn('Account', 'custom_loss_reasons');
    }
    if (tableInfo.custom_statuses) {
      await queryInterface.removeColumn('Account', 'custom_statuses');
    }
  }
};