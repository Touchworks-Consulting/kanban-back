const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/database/connection');

async function runMigrations() {
  try {
    console.log('🔍 Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso');

    // Verificar se a tabela SequelizeMeta existe, se não, criar
    console.log('📋 Verificando tabela de controle de migrations...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);

    // Buscar migrations executadas
    const [executedMigrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta"'
    );
    const executedNames = executedMigrations.map(m => m.name);

    // Buscar arquivos de migration
    const migrationsDir = path.join(__dirname, '../src/database/migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('❌ Pasta de migrations não encontrada:', migrationsDir);
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  Nenhum arquivo de migration encontrado');
      return;
    }

    console.log(`📦 Encontrados ${migrationFiles.length} arquivos de migration`);

    // Executar migrations pendentes
    let executedCount = 0;

    for (const filename of migrationFiles) {
      if (executedNames.includes(filename)) {
        console.log(`⏭️  Pulando ${filename} (já executada)`);
        continue;
      }

      console.log(`🔧 Executando migration: ${filename}`);

      try {
        const migrationPath = path.join(migrationsDir, filename);
        const migration = require(migrationPath);

        if (typeof migration.up !== 'function') {
          console.log(`❌ Migration ${filename} não possui função 'up'`);
          continue;
        }

        // Executar a migration
        await migration.up(sequelize.getQueryInterface(), sequelize.constructor);

        // Registrar como executada
        await sequelize.query(
          'INSERT INTO "SequelizeMeta" (name) VALUES (?)',
          {
            replacements: [filename],
            type: sequelize.QueryTypes.INSERT
          }
        );

        console.log(`✅ Migration ${filename} executada com sucesso`);
        executedCount++;

      } catch (error) {
        console.error(`❌ Erro ao executar migration ${filename}:`, error.message);
        break; // Para na primeira migration que falha
      }
    }

    if (executedCount === 0) {
      console.log('ℹ️  Nenhuma migration pendente para executar');
    } else {
      console.log(`🎉 ${executedCount} migrations executadas com sucesso!`);
    }

  } catch (error) {
    console.error('❌ Erro durante execução das migrations:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Migrations concluídas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na execução das migrations:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };