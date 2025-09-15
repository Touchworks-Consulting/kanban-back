const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuração do banco
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leads_crm',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '753951',
  logging: false
});

async function inspectDatabase() {
  try {
    console.log('🔍 Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conectado com sucesso!');

    // Consultar todas as tabelas
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📋 TABELAS ENCONTRADAS:');
    console.log('=======================');

    const schemaInfo = {
      tables: {},
      generated_at: new Date().toISOString(),
      database: process.env.DB_NAME || 'leads_crm'
    };

    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n🔸 Tabela: ${tableName}`);

      // Consultar colunas da tabela
      const [columns] = await sequelize.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      // Consultar índices
      const [indexes] = await sequelize.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = '${tableName}'
        AND schemaname = 'public';
      `);

      // Consultar foreign keys
      const [foreignKeys] = await sequelize.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = '${tableName}';
      `);

      schemaInfo.tables[tableName] = {
        columns: columns,
        indexes: indexes,
        foreignKeys: foreignKeys
      };

      // Log das colunas
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const type = col.character_maximum_length ?
          `${col.data_type}(${col.character_maximum_length})` :
          col.data_type;
        console.log(`  📄 ${col.column_name}: ${type} ${nullable}`);
        if (col.column_default) {
          console.log(`      Default: ${col.column_default}`);
        }
      });

      // Log dos índices
      if (indexes.length > 0) {
        console.log(`  🔗 Índices:`);
        indexes.forEach(idx => {
          console.log(`    - ${idx.indexname}`);
        });
      }

      // Log das foreign keys
      if (foreignKeys.length > 0) {
        console.log(`  🔑 Foreign Keys:`);
        foreignKeys.forEach(fk => {
          console.log(`    - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }
    }

    // Salvar informações em arquivo JSON
    const fs = require('fs');
    const schemaPath = './database-schema.json';
    fs.writeFileSync(schemaPath, JSON.stringify(schemaInfo, null, 2));
    console.log(`\n💾 Schema salvo em: ${schemaPath}`);

    // Criar arquivo de mapeamento para migrations
    const mappingContent = `// DATABASE SCHEMA MAPPING
// Generated at: ${new Date().toISOString()}
// Use this file as reference for migrations

const TABLE_NAMES = {
${tables.map(t => `  ${t.table_name.toUpperCase()}: '${t.table_name}'`).join(',\n')}
};

const EXISTING_COLUMNS = {
${Object.keys(schemaInfo.tables).map(tableName => {
  const cols = schemaInfo.tables[tableName].columns.map(c => `'${c.column_name}'`).join(', ');
  return `  '${tableName}': [${cols}]`;
}).join(',\n')}
};

const EXISTING_INDEXES = {
${Object.keys(schemaInfo.tables).map(tableName => {
  const indexes = schemaInfo.tables[tableName].indexes.map(i => `'${i.indexname}'`).join(', ');
  return `  '${tableName}': [${indexes}]`;
}).join(',\n')}
};

module.exports = {
  TABLE_NAMES,
  EXISTING_COLUMNS,
  EXISTING_INDEXES
};
`;

    fs.writeFileSync('./database-mapping.js', mappingContent);
    console.log(`📋 Mapeamento salvo em: ./database-mapping.js`);

    console.log('\n🎉 Inspeção completa!');
    console.log('\n📝 RESUMO:');
    console.log(`   - Total de tabelas: ${tables.length}`);
    console.log(`   - Tabelas encontradas: ${tables.map(t => t.table_name).join(', ')}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await sequelize.close();
  }
}

inspectDatabase();