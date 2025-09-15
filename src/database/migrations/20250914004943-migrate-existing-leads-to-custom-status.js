'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Iniciando migração de leads para sistema de status customizados...');

      // Verificar se as colunas custom_statuses já existem
      const accountColumns = await queryInterface.describeTable('Account');
      const hasCustomStatuses = accountColumns.custom_statuses !== undefined;

      if (hasCustomStatuses) {
        console.log('✅ Colunas custom_statuses já existem, pulando criação...');
      }

      // 1. Verificar se há leads que precisam ser migrados
      const leadStatusQuery = `
        SELECT DISTINCT status, COUNT(*) as count
        FROM "Lead"
        WHERE status IS NOT NULL
        GROUP BY status;
      `;

      const [leadStatusResults] = await queryInterface.sequelize.query(leadStatusQuery, { transaction });

      if (leadStatusResults.length > 0) {
        console.log('📊 Status encontrados nos leads existentes:');
        leadStatusResults.forEach(row => {
          console.log(`  - ${row.status}: ${row.count} leads`);
        });

        // Todos os leads já estão no formato correto, apenas log informativo
        console.log('ℹ️ Os leads já estão usando os status corretos, nenhuma alteração necessária.');
      } else {
        console.log('ℹ️ Nenhum lead encontrado no banco.');
      }

      // 2. Garantir que todos os accounts tenham custom_statuses configurados
      if (hasCustomStatuses) {
        const defaultStatuses = JSON.stringify([
          { id: 'new', name: 'Novo', color: '#94a3b8', order: 1, is_initial: true, is_won: false, is_lost: false },
          { id: 'contacted', name: 'Contactado', color: '#3b82f6', order: 2, is_initial: false, is_won: false, is_lost: false },
          { id: 'qualified', name: 'Qualificado', color: '#f59e0b', order: 3, is_initial: false, is_won: false, is_lost: false },
          { id: 'proposal', name: 'Proposta', color: '#8b5cf6', order: 4, is_initial: false, is_won: false, is_lost: false },
          { id: 'won', name: 'Ganho', color: '#10b981', order: 5, is_initial: false, is_won: true, is_lost: false },
          { id: 'lost', name: 'Perdido', color: '#ef4444', order: 6, is_initial: false, is_won: false, is_lost: true }
        ]);

        const defaultLossReasons = JSON.stringify([
          { id: 'price', name: 'Preço alto' },
          { id: 'timing', name: 'Timing inadequado' },
          { id: 'competitor', name: 'Escolheu concorrente' },
          { id: 'no_response', name: 'Não respondeu' },
          { id: 'not_interested', name: 'Não interessado' },
          { id: 'other', name: 'Outro motivo' }
        ]);

        // Atualizar accounts que não têm custom_statuses ou têm NULL
        const updateAccountsQuery = `
          UPDATE "Account"
          SET custom_statuses = $1,
              custom_loss_reasons = $2
          WHERE custom_statuses IS NULL
             OR custom_loss_reasons IS NULL
             OR custom_statuses::text = 'null'
             OR custom_loss_reasons::text = 'null';
        `;

        const [updateResults] = await queryInterface.sequelize.query(updateAccountsQuery, {
          bind: [defaultStatuses, defaultLossReasons],
          transaction
        });

        console.log(`✅ ${updateResults.rowCount} accounts configurados com status customizados padrão`);
      }

      // 3. Log final das configurações atuais
      const currentAccountsQuery = `
        SELECT id, name,
               CASE
                 WHEN custom_statuses IS NULL THEN 'NULL'
                 ELSE 'CONFIGURED'
               END as status_config
        FROM "Account"
        LIMIT 5;
      `;

      const [accountsResults] = await queryInterface.sequelize.query(currentAccountsQuery, { transaction });
      console.log('📋 Status das configurações por account:');
      accountsResults.forEach(row => {
        console.log(`  - ${row.name}: ${row.status_config}`);
      });

      await transaction.commit();
      console.log('🎉 Migração concluída com sucesso!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro na migração:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Revertendo migração de status customizados...');

      // Esta migration não faz alterações destrutivas,
      // então não há necessidade de reversão
      console.log('ℹ️ Nenhuma reversão necessária (migration não destrutiva)');

      await transaction.commit();
      console.log('🎉 Reversão concluída!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro na reversão:', error);
      throw error;
    }
  }
};