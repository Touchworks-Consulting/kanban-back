'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar novo tipo de job ao enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_cron_jobs_type" ADD VALUE 'activity_overdue';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Não é possível remover valores de enum em PostgreSQL
    // Em caso de rollback, seria necessário:
    // 1. Criar novo enum sem o valor
    // 2. Alterar tabela para usar novo enum
    // 3. Deletar enum antigo
    // Para simplificar, deixamos como está (o valor continuará disponível)
    console.log('Rollback: Mantendo enum como está - não é possível remover valores de enum no PostgreSQL');
  }
};