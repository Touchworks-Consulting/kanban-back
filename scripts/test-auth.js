require('dotenv').config();
const { sequelize } = require('../src/database/connection');
const User = require('../src/models/User');

async function testAuth() {
  try {
    console.log('🔍 Testing authentication setup...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check users table structure and data
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Users table structure:');
    results.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Count users
    const userCount = await User.count();
    console.log(`\n👥 Total users: ${userCount}`);

    // Try to create a test user if none exist
    if (userCount === 0) {
      console.log('🔧 Creating default admin user...');

      const testUser = await User.create({
        account_id: '00000000-0000-0000-0000-000000000001',
        name: 'Admin',
        email: 'admin@example.com',
        password: '123456',
        role: 'owner'
      });

      console.log('✅ Test user created:', testUser.email);
    } else {
      // List existing users
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'is_active'],
        limit: 5
      });

      console.log('\n👤 Existing users:');
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.is_active ? 'active' : 'inactive'}`);
      });
    }

    // Test a specific query like the one that's failing
    console.log('\n🧪 Testing specific query...');
    const testUser = await User.findOne({
      where: { email: 'admin@example.com' }
    });

    if (testUser) {
      console.log('✅ Query successful, found user:', testUser.name);
    } else {
      console.log('ℹ️  No user found with email admin@example.com');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testAuth();