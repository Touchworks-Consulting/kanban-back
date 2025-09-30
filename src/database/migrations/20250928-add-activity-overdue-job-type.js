'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se o enum existe antes de adicionar o valor
    try {
      const enumExists = await queryInterface.sequelize.query(`
        SELECT 1 FROM pg_type WHERE typname = 'enum_cron_jobs_type';
      `, { type: Sequelize.QueryTypes.SELECT });

      if (enumExists.length > 0) {
        // Verificar se o valor já existe
        const valueExists = await queryInterface.sequelize.query(`
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_cron_jobs_type')
          AND enumlabel = 'activity_overdue';
        `, { type: Sequelize.QueryTypes.SELECT });

        if (valueExists.length === 0) {
          await queryInterface.sequelize.query(`
            ALTER TYPE "enum_cron_jobs_type" ADD VALUE 'activity_overdue';
          `);
          console.log('✅ Valor activity_overdue adicionado ao enum_cron_jobs_type');
        } else {
          console.log('⚠️ Valor activity_overdue já existe no enum_cron_jobs_type');
        }
      } else {
        console.log('⚠️ Enum enum_cron_jobs_type não existe - pulando migration (tabela cron_jobs pode não existir em produção)');
      }
    } catch (error) {
      console.log('⚠️ Erro ao adicionar valor ao enum:', error.message);
      console.log('ℹ️ Esta migration não é crítica - continuando...');
    }
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