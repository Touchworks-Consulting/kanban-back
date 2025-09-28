require('dotenv').config();
const { sequelize } = require('./connection');
const fs = require('fs');
const path = require('path');

async function runNewMigrations() {
  try {
    console.log('🚀 Executando novas migrações...');

    // Testar conexão
    console.log('📡 Testando conexão com PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso!');

    // Verificar se as tabelas já existem
    const [existingTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('lead_contacts', 'lead_files')
    `);

    console.log('📋 Tabelas existentes:', existingTables.map(t => t.table_name));

    // Lista das migrações para executar
    const migrationsToRun = [
      '20250927-update-lead-activities.js',
      '20250927-create-lead-contacts.js',
      '20250927-create-lead-files.js'
    ];

    const migrationsDir = path.join(__dirname, 'migrations');

    for (const migrationFile of migrationsToRun) {
      const migrationPath = path.join(migrationsDir, migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️ Migração não encontrada: ${migrationFile}`);
        continue;
      }

      console.log(`🔧 Executando migração: ${migrationFile}`);

      try {
        const migration = require(migrationPath);

        // Verificar se a migração é necessária
        const tableName = migrationFile.includes('lead-contacts') ? 'lead_contacts' :
                         migrationFile.includes('lead-files') ? 'lead_files' : null;

        if (tableName) {
          const tableExists = existingTables.some(t => t.table_name === tableName);
          if (tableExists) {
            console.log(`   ⭐ Tabela ${tableName} já existe, pulando...`);
            continue;
          }
        }

        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
        console.log(`   ✅ Migração ${migrationFile} executada com sucesso!`);

      } catch (migrationError) {
        console.error(`   ❌ Erro na migração ${migrationFile}:`, migrationError.message);
        throw migrationError;
      }
    }

    console.log('🎉 Todas as migrações foram executadas!');

  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Dica: Certifique-se de que o PostgreSQL está rodando');
    }

    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runNewMigrations();
}

module.exports = runNewMigrations;