require('dotenv').config();
const fs = require('fs');

// Force use of Neon DATABASE_URL
const DATABASE_URL = 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = DATABASE_URL;
process.env.NODE_ENV = 'production';

const { createSequelizeInstance } = require('../src/database/connection');

async function applySchemaToNeon() {
  console.log('🚀 Applying schema to Neon database...');

  let sequelize;
  try {
    // Create fresh connection to Neon
    sequelize = createSequelizeInstance();

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to Neon database');

    // Read SQL file
    const sqlContent = fs.readFileSync('scripts/neon-schema.sql', 'utf8');
    console.log('📄 SQL file loaded');

    // Execute schema creation
    console.log('\n🔧 Creating tables...');
    await sequelize.query(sqlContent);
    console.log('✅ Schema applied successfully');

    // Check created tables
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n✅ Created ${tables.length} tables:`);
    tables.forEach(table => console.log(`  - ${table.table_name}`));

    // Create initial users
    console.log('\n👤 Creating initial users...');

    // Insert account
    await sequelize.query(`
      INSERT INTO "Account" (id, name, email, is_active, created_at, updated_at, custom_statuses)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Empresa Principal',
        'admin@empresa.com',
        true,
        now(),
        now(),
        null
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // Insert admin user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('123456', 10);

    await sequelize.query(`
      INSERT INTO users (id, account_id, name, email, password, role, is_active, current_account_id, "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001',
        'Administrador',
        'admin@admin.com',
        $1,
        'owner',
        true,
        '00000000-0000-0000-0000-000000000001',
        now(),
        now()
      ) ON CONFLICT (email) DO NOTHING;
    `, {
      bind: [hashedPassword]
    });

    // Insert test user (the one trying to register)
    const testHashedPassword = await bcrypt.hash('123456', 10);

    await sequelize.query(`
      INSERT INTO users (id, account_id, name, email, password, role, is_active, current_account_id, "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001',
        'WENENDY',
        'wenendy@touchworks.com.br',
        $1,
        'owner',
        true,
        '00000000-0000-0000-0000-000000000001',
        now(),
        now()
      ) ON CONFLICT (email) DO NOTHING;
    `, {
      bind: [testHashedPassword]
    });

    console.log('✅ Initial users created');

    // Verify users
    const [users] = await sequelize.query(`
      SELECT name, email, role, is_active FROM users ORDER BY "created_at";
    `);

    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.is_active ? 'active' : 'inactive'}`);
    });

    console.log('\n🎉 Neon database setup completed successfully!');
    console.log('\nLogin credentials:');
    console.log('- admin@admin.com / 123456');
    console.log('- wenendy@touchworks.com.br / 123456');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

applySchemaToNeon();