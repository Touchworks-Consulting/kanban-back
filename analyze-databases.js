const { Client } = require('pg');

// Configurações dos bancos
const productionConfig = {
  connectionString: 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

const developmentConfig = {
  host: 'localhost',
  port: 5433,
  database: 'kanban_crm',
  user: 'postgres',
  password: '753951'
};

async function getTableStructure(client) {
  const tablesQuery = `
    SELECT
      table_name,
      table_schema
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const tablesResult = await client.query(tablesQuery);
  const tables = {};

  for (const table of tablesResult.rows) {
    const tableName = table.table_name;

    // Buscar colunas da tabela
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columnsResult = await client.query(columnsQuery, [tableName]);

    // Buscar índices da tabela
    const indexesQuery = `
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = $1;
    `;

    const indexesResult = await client.query(indexesQuery, [tableName]);

    // Buscar constraints da tabela
    const constraintsQuery = `
      SELECT
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
      );
    `;

    const constraintsResult = await client.query(constraintsQuery, [tableName]);

    tables[tableName] = {
      columns: columnsResult.rows,
      indexes: indexesResult.rows,
      constraints: constraintsResult.rows
    };
  }

  return tables;
}

async function analyzeDatabases() {
  console.log('🔍 Analisando estrutura dos bancos de dados...\n');

  let prodClient, devClient;

  try {
    // Conectar ao banco de produção
    console.log('📡 Conectando ao banco de PRODUÇÃO...');
    prodClient = new Client(productionConfig);
    await prodClient.connect();
    console.log('✅ Conectado ao banco de produção\n');

    // Conectar ao banco de desenvolvimento
    console.log('📡 Conectando ao banco de DESENVOLVIMENTO...');
    devClient = new Client(developmentConfig);
    await devClient.connect();
    console.log('✅ Conectado ao banco de desenvolvimento\n');

    // Obter estruturas
    console.log('🔎 Extraindo estrutura do banco de PRODUÇÃO...');
    const prodTables = await getTableStructure(prodClient);
    console.log(`✅ Produção: ${Object.keys(prodTables).length} tabelas encontradas\n`);

    console.log('🔎 Extraindo estrutura do banco de DESENVOLVIMENTO...');
    const devTables = await getTableStructure(devClient);
    console.log(`✅ Desenvolvimento: ${Object.keys(devTables).length} tabelas encontradas\n`);

    // Comparar estruturas
    console.log('📊 ANÁLISE COMPARATIVA:\n');
    console.log('='.repeat(80));

    // Tabelas em desenvolvimento que não existem em produção
    const newTables = Object.keys(devTables).filter(t => !prodTables[t]);
    if (newTables.length > 0) {
      console.log('\n🆕 NOVAS TABELAS (existem em DEV, faltam em PROD):');
      newTables.forEach(table => {
        console.log(`   - ${table} (${devTables[table].columns.length} colunas)`);
      });
    }

    // Tabelas em produção que não existem em desenvolvimento
    const removedTables = Object.keys(prodTables).filter(t => !devTables[t]);
    if (removedTables.length > 0) {
      console.log('\n⚠️  TABELAS APENAS EM PRODUÇÃO (não existem em DEV):');
      removedTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }

    // Tabelas comuns - verificar diferenças de colunas
    const commonTables = Object.keys(devTables).filter(t => prodTables[t]);
    console.log(`\n📋 TABELAS COMUNS: ${commonTables.length}`);

    for (const tableName of commonTables) {
      const devColumns = devTables[tableName].columns.map(c => c.column_name);
      const prodColumns = prodTables[tableName].columns.map(c => c.column_name);

      const newColumns = devColumns.filter(c => !prodColumns.includes(c));
      const removedColumns = prodColumns.filter(c => !devColumns.includes(c));

      if (newColumns.length > 0 || removedColumns.length > 0) {
        console.log(`\n   📝 ${tableName}:`);

        if (newColumns.length > 0) {
          console.log(`      🆕 Novas colunas: ${newColumns.join(', ')}`);
        }

        if (removedColumns.length > 0) {
          console.log(`      ⚠️  Colunas removidas: ${removedColumns.join(', ')}`);
        }
      }
    }

    // Salvar estruturas completas em arquivos JSON
    const fs = require('fs');
    fs.writeFileSync(
      '/mnt/c/Users/wenen/Documents/kanban/production-schema.json',
      JSON.stringify(prodTables, null, 2)
    );
    fs.writeFileSync(
      '/mnt/c/Users/wenen/Documents/kanban/development-schema.json',
      JSON.stringify(devTables, null, 2)
    );

    console.log('\n\n💾 Schemas salvos em:');
    console.log('   - production-schema.json');
    console.log('   - development-schema.json');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Análise concluída!\n');

  } catch (error) {
    console.error('❌ Erro durante análise:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (prodClient) await prodClient.end();
    if (devClient) await devClient.end();
  }
}

analyzeDatabases();