'use strict';

/**
 * Migration: Add Performance Indexes to Lead and LeadHistory tables
 *
 * Problem: Queries were extremely slow with 1000+ leads due to missing indexes
 * Solution: Add composite indexes on frequently queried columns
 *
 * Expected Impact: 10-50x faster queries
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Verificando e adicionando índices de performance...');

    // Função para verificar se índice existe
    const indexExists = async (tableName, indexName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = '${tableName}' AND indexname = '${indexName}';
      `);
      return results.length > 0;
    };

    // Função auxiliar para adicionar índice se não existir
    const addIndexIfNotExists = async (tableName, columns, options) => {
      const exists = await indexExists(tableName, options.name);
      if (exists) {
        console.log(`⏭️  Índice ${options.name} já existe, pulando...`);
        return;
      }

      try {
        await queryInterface.addIndex(tableName, columns, options);
        console.log(`✅ Índice ${options.name} criado com sucesso`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Índice ${options.name} já existe (detectado no erro), pulando...`);
        } else {
          console.error(`❌ Erro ao criar índice ${options.name}:`, error.message);
          throw error;
        }
      }
    };

    // Lead table indexes
    console.log('\n📊 Processando índices da tabela Lead...');
    await addIndexIfNotExists('Lead', ['account_id'], {
      name: 'idx_lead_account_id'
    });

    await addIndexIfNotExists('Lead', ['status'], {
      name: 'idx_lead_status'
    });

    await addIndexIfNotExists('Lead', ['column_id'], {
      name: 'idx_lead_column_id'
    });

    await addIndexIfNotExists('Lead', ['created_at'], {
      name: 'idx_lead_created_at'
    });

    // Composite indexes for common query patterns
    await addIndexIfNotExists('Lead', ['account_id', 'status'], {
      name: 'idx_lead_account_status'
    });

    await addIndexIfNotExists('Lead', ['account_id', 'column_id'], {
      name: 'idx_lead_account_column'
    });

    await addIndexIfNotExists('Lead', ['account_id', 'created_at'], {
      name: 'idx_lead_account_created'
    });

    await addIndexIfNotExists('Lead', ['account_id', 'is_customer', 'created_at'], {
      name: 'idx_lead_account_customer_created'
    });

    console.log('✅ Índices da tabela Lead verificados/criados');

    // lead_histories table indexes (nome correto da tabela)
    console.log('\n📊 Verificando tabela lead_histories...');

    try {
      // Verificar se tabela lead_histories existe (nome lowercase com underscore)
      const tableExists = await queryInterface.describeTable('lead_histories')
        .then(() => true)
        .catch(() => false);

      if (tableExists) {
        console.log('✅ Tabela lead_histories encontrada, adicionando índices...');

        await addIndexIfNotExists('lead_histories', ['lead_id', 'to_column_id', 'moved_at'], {
          name: 'idx_lead_histories_lead_to_moved'
        });

        await addIndexIfNotExists('lead_histories', ['from_column_id', 'moved_at'], {
          name: 'idx_lead_histories_from_moved'
        });

        console.log('✅ Índices da tabela lead_histories verificados/criados');
      } else {
        console.log('⚠️ Tabela lead_histories não existe, pulando índices dessa tabela');
      }
    } catch (error) {
      console.log('⚠️ Erro ao processar lead_histories:', error.message);
    }

    console.log('\n🎉 Migração de índices de performance concluída com sucesso!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️ Removing performance indexes from Lead table...');

    // Remove Lead indexes
    await queryInterface.removeIndex('Lead', 'idx_lead_account_id');
    await queryInterface.removeIndex('Lead', 'idx_lead_status');
    await queryInterface.removeIndex('Lead', 'idx_lead_column_id');
    await queryInterface.removeIndex('Lead', 'idx_lead_created_at');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_status');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_column');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_created');
    await queryInterface.removeIndex('Lead', 'idx_lead_account_customer_created');

    console.log('✅ Lead table indexes removed');

    // Remove LeadHistory indexes
    console.log('🗑️ Removing performance indexes from LeadHistory table...');

    await queryInterface.removeIndex('LeadHistory', 'idx_lead_history_lead_to_moved');
    await queryInterface.removeIndex('LeadHistory', 'idx_lead_history_from_moved');

    console.log('✅ LeadHistory table indexes removed');
    console.log('✅ All indexes removed successfully');
  }
};
