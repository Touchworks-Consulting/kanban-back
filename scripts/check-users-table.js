require('dotenv').config();

// Force use of Neon DATABASE_URL
const DATABASE_URL = 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = DATABASE_URL;
process.env.NODE_ENV = 'production';

const { createSequelizeInstance } = require('../src/database/connection');

async function checkUsersTable() {
  console.log('🔍 Checking users table in Neon database...');

  let sequelize;
  try {
    // Create fresh connection to Neon
    sequelize = createSequelizeInstance();

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to Neon database');

    // Check if users table exists
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users';
    `);

    if (tables.length === 0) {
      console.log('❌ Users table does NOT exist');

      // Create users table directly
      console.log('🔧 Creating users table...');

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "account_id" UUID NOT NULL,
          "name" VARCHAR(255) NOT NULL,
          "email" VARCHAR(255) NOT NULL,
          "password" VARCHAR(255) NOT NULL,
          "role" VARCHAR(50),
          "is_active" BOOLEAN DEFAULT true,
          "last_login_at" TIMESTAMPTZ,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "current_account_id" UUID,
          PRIMARY KEY ("id"),
          UNIQUE ("email")
        );
      `);

      console.log('✅ Users table created');

    } else {
      console.log('✅ Users table exists');
    }

    // Check table structure
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Users table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `(${col.column_default})` : ''}`);
    });

    // Check existing users
    const [users] = await sequelize.query(`
      SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at;
    `);

    console.log(`\n👥 Found ${users.length} users:`);
    if (users.length === 0) {
      console.log('  No users found');

      // Create test users
      console.log('\n👤 Creating test users...');

      const bcrypt = require('bcrypt');
      const adminPassword = await bcrypt.hash('123456', 10);
      const testPassword = await bcrypt.hash('123456', 10);

      // First create account if it doesn't exist
      await sequelize.query(`
        INSERT INTO "Account" (id, name, email, is_active, created_at, updated_at)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'Empresa Principal',
          'admin@empresa.com',
          true,
          now(),
          now()
        ) ON CONFLICT (id) DO NOTHING;
      `);

      // Insert admin user
      await sequelize.query(`
        INSERT INTO users (id, account_id, name, email, password, role, is_active, current_account_id, created_at, updated_at)
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
        bind: [adminPassword]
      });

      // Insert test user
      await sequelize.query(`
        INSERT INTO users (id, account_id, name, email, password, role, is_active, current_account_id, created_at, updated_at)
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
        bind: [testPassword]
      });

      console.log('✅ Test users created');

    } else {
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.is_active ? 'active' : 'inactive'}`);
      });
    }

    console.log('\n🎉 Users table check completed!');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

checkUsersTable();