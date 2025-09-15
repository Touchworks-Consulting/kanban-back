require('dotenv').config();

// Force use of Neon DATABASE_URL
const DATABASE_URL = 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = DATABASE_URL;
process.env.NODE_ENV = 'production';

const { createSequelizeInstance } = require('../src/database/connection');

async function forceSyncNeon() {
  console.log('🚀 Force syncing all tables to Neon database...');

  let sequelize;
  try {
    // Create fresh connection to Neon
    sequelize = createSequelizeInstance();

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to Neon database');

    // Import all models first
    console.log('\n📦 Loading all models...');
    const models = require('../src/models');
    console.log('✅ Models loaded');

    // Force sync - this will DROP and recreate all tables
    console.log('\n🔥 FORCE syncing (this will recreate all tables)...');
    await sequelize.sync({ force: true });
    console.log('✅ All tables created successfully');

    // Check tables after sync
    console.log('\n📋 Checking created tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`✅ Created ${tables.length} tables:`);
    tables.forEach(table => console.log(`  - ${table.table_name}`));

    // Create initial admin user and account
    console.log('\n👤 Creating initial admin account and user...');
    const { User, Account } = models;

    // Create account first
    const account = await Account.create({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Empresa Principal',
      email: 'admin@empresa.com',
      plan: 'pro',
      is_active: true,
      custom_statuses: null
    });

    console.log('✅ Created account:', account.name);

    // Create admin user
    const adminUser = await User.create({
      account_id: account.id,
      name: 'Administrador',
      email: 'admin@admin.com',
      password: '123456',
      role: 'owner',
      current_account_id: account.id,
      is_active: true
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create a test user matching the one trying to register
    const testUser = await User.create({
      account_id: account.id,
      name: 'WENENDY',
      email: 'wenendy@touchworks.com.br',
      password: '123456',
      role: 'owner',
      current_account_id: account.id,
      is_active: true
    });

    console.log('✅ Created test user:', testUser.email);

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

forceSyncNeon();