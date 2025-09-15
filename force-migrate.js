require('dotenv').config();
const { sequelize } = require('./src/database/connection');

// Importar apenas os novos modelos para sincronização
const Campaign = require('./src/models/Campaign');
const TriggerPhrase = require('./src/models/TriggerPhrase');

async function forceMigrate() {
  try {
    console.log('🔥 Forçando sincronização de novos modelos...');
    
    // Testar conexão
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida');
    
    // Sincronizar apenas os novos modelos com force
    console.log('📦 Sincronizando modelo Campaign...');
    await Campaign.sync({ force: true });
    console.log('✅ Tabela campaigns criada');
    
    console.log('📦 Sincronizando modelo TriggerPhrase...');
    await TriggerPhrase.sync({ force: true });
    console.log('✅ Tabela trigger_phrases criada');
    
    console.log('🎉 Migração forçada concluída!');
  } catch (error) {
    console.error('❌ Erro na migração forçada:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

forceMigrate();