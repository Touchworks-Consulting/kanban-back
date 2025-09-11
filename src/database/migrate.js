require('dotenv').config();
const { sequelize } = require('./connection');
require('../models'); // Importar modelos para sincronizar

async function migrate() {
  try {
    console.log('� Iniciando migração do banco de dados...');
    
    // Testar conexão
    console.log('📡 Testando conexão com PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Sincronizar modelos
    console.log('🔧 Sincronizando modelos...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Modelos sincronizados com sucesso!');
    
    // Mostrar informações do banco
    try {
      const [results] = await sequelize.query(`
        SELECT 
          current_database() as database_name,
          current_user as current_user,
          version() as postgresql_version
      `);
      
      console.log('📊 Informações do banco:');
      console.log(`   Banco: ${results[0].database_name}`);
      console.log(`   Usuário: ${results[0].current_user}`);
      console.log(`   Versão: ${results[0].postgresql_version.split(' ')[0]}`);
    } catch (infoError) {
      console.log('ℹ️ Não foi possível obter informações detalhadas do banco');
    }
    
    console.log('🎉 Migração concluída!');
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Dica: Certifique-se de que o PostgreSQL está rodando:');
      console.error('   - Docker: docker-compose up -d postgres');
      console.error('   - Local: verifique se o serviço PostgreSQL está ativo');
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrate();
}

module.exports = migrate;
