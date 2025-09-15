require('dotenv').config();

// Use local database first to export schema, then apply to Neon
const { sequelize } = require('../src/database/connection');

async function exportSchema() {
  console.log('🔍 Exporting schema from local database...');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to local database');

    // Get CREATE TABLE statements for all tables
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != 'SequelizeMeta'
      ORDER BY table_name;
    `);

    console.log('\n📋 Found tables:', tables.map(t => t.table_name));

    let createStatements = [];

    for (const table of tables) {
      const tableName = table.table_name;

      // Get table structure
      const [columns] = await sequelize.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      console.log(`\n🔧 Generating CREATE statement for ${tableName}...`);

      let createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
      const columnDefs = [];

      for (const col of columns) {
        let colDef = `  "${col.column_name}" `;

        // Map data types
        switch (col.data_type) {
          case 'uuid':
            colDef += 'UUID';
            break;
          case 'character varying':
            colDef += col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
            break;
          case 'text':
            colDef += 'TEXT';
            break;
          case 'integer':
            colDef += 'INTEGER';
            break;
          case 'boolean':
            colDef += 'BOOLEAN';
            break;
          case 'timestamp with time zone':
            colDef += 'TIMESTAMPTZ';
            break;
          case 'json':
          case 'jsonb':
            colDef += 'JSONB';
            break;
          default:
            colDef += col.data_type.toUpperCase();
        }

        // Add constraints
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }

        if (col.column_default && !col.column_default.includes('nextval')) {
          if (col.column_default.includes('uuid_generate_v4')) {
            colDef += ' DEFAULT gen_random_uuid()';
          } else if (col.column_default === 'true') {
            colDef += ' DEFAULT true';
          } else if (col.column_default === 'false') {
            colDef += ' DEFAULT false';
          } else if (col.column_default === 'now()') {
            colDef += ' DEFAULT now()';
          } else if (col.column_default === "'{}'::jsonb") {
            colDef += " DEFAULT '{}'::jsonb";
          }
        }

        columnDefs.push(colDef);
      }

      // Add primary key constraint
      const [primaryKeys] = await sequelize.query(`
        SELECT column_name
        FROM information_schema.key_column_usage
        WHERE table_name = '${tableName}'
        AND constraint_name LIKE '%_pkey'
        ORDER BY ordinal_position;
      `);

      if (primaryKeys.length > 0) {
        const pkCols = primaryKeys.map(pk => `"${pk.column_name}"`).join(', ');
        columnDefs.push(`  PRIMARY KEY (${pkCols})`);
      }

      createSQL += columnDefs.join(',\n') + '\n);';
      createStatements.push(createSQL);
    }

    // Write SQL file
    const fs = require('fs');
    const sqlContent = createStatements.join('\n\n') + '\n';
    fs.writeFileSync('scripts/neon-schema.sql', sqlContent);

    console.log('\n✅ Schema exported to scripts/neon-schema.sql');
    console.log(`Generated ${createStatements.length} CREATE TABLE statements`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

exportSchema();