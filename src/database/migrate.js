const { sequelize } = require('./connection');
require('../models'); // Importar modelos para sincronizar

async function migrate() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');
    
    await sequelize.authenticate();
    console.log('✅ Conexão com banco estabelecida');
    
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Modelos sincronizados com sucesso');
    
    console.log('🎉 Migração concluída!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
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
