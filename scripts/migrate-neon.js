require('dotenv').config();

// Force use of Neon DATABASE_URL
const DATABASE_URL = 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = DATABASE_URL;

const { createSequelizeInstance } = require('../src/database/connection');

async function runMigrationsOnNeon() {
  console.log('🚀 Running migrations on Neon database...');

  let sequelize;
  try {
    // Create fresh connection to Neon
    sequelize = createSequelizeInstance();

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to Neon database');

    // Check current state
    console.log('\n📋 Checking current tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Current tables:', tables.map(t => t.table_name));

    // Import all models to register them with sequelize FIRST
    console.log('\n📦 Loading all models...');
    require('../src/models');

    // Run sync to create all tables based on models
    console.log('\n🔧 Creating tables from models...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Tables created/updated');

    // Check tables after sync
    console.log('\n📋 Checking tables after sync...');
    const [newTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables after sync:', newTables.map(t => t.table_name));

    // Create initial admin user if users table is empty
    console.log('\n👤 Checking for users...');
    const User = require('../src/models/User');
    const Account = require('../src/models/Account');

    const userCount = await User.count();
    console.log(`Found ${userCount} users`);

    if (userCount === 0) {
      console.log('🔧 Creating initial admin account and user...');

      // Create account first
      const account = await Account.create({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Empresa Principal',
        plan: 'pro',
        is_active: true
      });

      // Create admin user
      const adminUser = await User.create({
        account_id: account.id,
        name: 'Administrador',
        email: 'admin@admin.com',
        password: '123456',
        role: 'owner',
        current_account_id: account.id
      });

      console.log('✅ Created admin user:', adminUser.email);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

runMigrationsOnNeon();