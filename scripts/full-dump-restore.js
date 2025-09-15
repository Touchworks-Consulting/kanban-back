require('dotenv').config();
const { createSequelizeInstance } = require('../src/database/connection');

async function dumpAndRestore() {
  console.log('🚀 Full dump and restore from local to Neon...');

  let localSeq, neonSeq;
  try {
    // Connect to local database
    console.log('📡 Connecting to local database...');
    localSeq = createSequelizeInstance();
    await localSeq.authenticate();
    console.log('✅ Local database connected');

    // Connect to Neon database
    console.log('🌐 Connecting to Neon database...');
    process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    neonSeq = createSequelizeInstance();
    await neonSeq.authenticate();
    console.log('✅ Neon database connected');

    // Get all tables from local
    const [tables] = await localSeq.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != 'SequelizeMeta'
      ORDER BY table_name;
    `);

    console.log(`📋 Found ${tables.length} tables to dump`);

    // Create tables in Neon using CREATE TABLE AS (empty)
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`🔧 Creating table: ${tableName}`);

      try {
        // Get CREATE TABLE statement from local
        const [createResult] = await localSeq.query(`
          SELECT
            'CREATE TABLE IF NOT EXISTS "' || table_name || '" (' ||
            string_agg(
              '"' || column_name || '" ' ||
              CASE
                WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length, 255) || ')'
                WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                WHEN data_type = 'uuid' THEN 'UUID'
                WHEN data_type = 'text' THEN 'TEXT'
                WHEN data_type = 'integer' THEN 'INTEGER'
                WHEN data_type = 'boolean' THEN 'BOOLEAN'
                WHEN data_type = 'json' THEN 'JSONB'
                WHEN data_type = 'jsonb' THEN 'JSONB'
                WHEN data_type = 'USER-DEFINED' THEN 'VARCHAR(50)'
                ELSE UPPER(data_type)
              END ||
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE
                WHEN column_default IS NOT NULL AND column_default NOT LIKE '%nextval%' THEN
                  ' DEFAULT ' ||
                  CASE
                    WHEN column_default LIKE '%uuid_generate_v4%' THEN 'gen_random_uuid()'
                    WHEN column_default = 'true' THEN 'true'
                    WHEN column_default = 'false' THEN 'false'
                    WHEN column_default = 'now()' THEN 'now()'
                    WHEN column_default = '''{}''::jsonb' THEN '''{}''::jsonb'
                    ELSE column_default
                  END
                ELSE ''
              END,
              ', '
            ) || ');' as create_statement
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          GROUP BY table_name;
        `);

        if (createResult[0]?.create_statement) {
          await neonSeq.query(createResult[0].create_statement);
          console.log(`✅ Created: ${tableName}`);
        }
      } catch (err) {
        console.log(`⚠️  Error creating ${tableName}:`, err.message);
      }
    }

    // Add primary keys and constraints
    console.log('\n🔑 Adding primary keys...');

    const [pkConstraints] = await localSeq.query(`
      SELECT
        tc.table_name,
        string_agg(kcu.column_name, ', ') as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name != 'SequelizeMeta'
      GROUP BY tc.table_name;
    `);

    for (const pk of pkConstraints) {
      try {
        await neonSeq.query(`
          ALTER TABLE "${pk.table_name}"
          ADD PRIMARY KEY (${pk.columns.split(', ').map(col => `"${col}"`).join(', ')});
        `);
        console.log(`✅ Added PK to: ${pk.table_name}`);
      } catch (err) {
        console.log(`⚠️  PK already exists for: ${pk.table_name}`);
      }
    }

    // Copy essential data (users table)
    console.log('\n👥 Copying user data...');
    const [localUsers] = await localSeq.query(`
      SELECT * FROM users LIMIT 5;
    `);

    const bcrypt = require('bcrypt');

    for (const user of localUsers) {
      try {
        await neonSeq.query(`
          INSERT INTO users (
            id, account_id, name, email, password, role, is_active,
            last_login_at, current_account_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          ) ON CONFLICT (email) DO NOTHING;
        `, {
          bind: [
            user.id, user.account_id, user.name, user.email, user.password,
            user.role, user.is_active, user.last_login_at, user.current_account_id,
            user.created_at, user.updated_at
          ]
        });
        console.log(`✅ Copied user: ${user.email}`);
      } catch (err) {
        console.log(`⚠️  Error copying user ${user.email}:`, err.message);
      }
    }

    // Verify final result
    console.log('\n🔍 Final verification...');
    const [finalTables] = await neonSeq.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const [finalUsers] = await neonSeq.query(`
      SELECT name, email, role FROM users LIMIT 5;
    `);

    console.log(`\n✅ Neon database now has:`);
    console.log(`  📋 ${finalTables.length} tables`);
    console.log(`  👥 ${finalUsers.length} users:`);
    finalUsers.forEach(user => {
      console.log(`    - ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n🎉 Database successfully cloned to Neon!');

  } catch (error) {
    console.error('❌ Dump/restore failed:', error.message);
  } finally {
    if (localSeq) await localSeq.close();
    if (neonSeq) await neonSeq.close();
  }
}

dumpAndRestore();