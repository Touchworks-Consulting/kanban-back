require('dotenv').config();
const { sequelize } = require('./src/database/connection');

async function testConnection() {
  try {
    console.log('🔌 Testando conexão com banco de dados...');
    console.log('📋 Configuração:');
    console.log(`  Host: ${process.env.DB_HOST}`);
    console.log(`  Port: ${process.env.DB_PORT}`);
    console.log(`  Database: ${process.env.DB_NAME}`);
    console.log(`  User: ${process.env.DB_USER}`);
    console.log(`  Password: ${'*'.repeat(process.env.DB_PASSWORD?.length || 0)}`);

    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados bem-sucedida!');

    // Testar query simples
    const result = await sequelize.query('SELECT NOW() as current_time', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log('🕐 Hora atual do banco:', result[0].current_time);

  } catch (error) {
    console.error('❌ Erro na conexão com o banco:');
    console.error('Erro:', error.message);
    if (error.original) {
      console.error('Erro SQL:', error.original.message);
    }
  } finally {
    await sequelize.close();
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });