require('dotenv').config();
const { sequelize } = require('../src/database/connection');

async function inspectDatabase() {
  try {
    console.log('🔍 Inspecting Neon database...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Get all table names
    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Tables in database:');
    if (results.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      results.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // Check if SequelizeMeta exists (migration tracking table)
    const [metaResults] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `).catch(() => [[]]);

    console.log('\n📝 Migration history:');
    if (metaResults.length === 0) {
      console.log('❌ No migration records found');
    } else {
      metaResults.forEach(row => {
        console.log(`  ✓ ${row.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Database inspection failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

inspectDatabase();