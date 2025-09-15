const { sequelize } = require('./src/database/connection');
const Account = require('./src/models/Account');

async function debugLogin() {
  await sequelize.sync();
  
  console.log('Testando busca de conta...');
  
  const testEmail = 'admin@example.com';
  const testApiKey = 'demo_api_key_change_me';
  
  console.log(`Buscando: email="${testEmail}", api_key="${testApiKey}"`);
  
  // Busca exata como no controller
  const account = await Account.findOne({
    where: {
      email: testEmail.toLowerCase(),
      api_key: testApiKey,
      is_active: true
    }
  });
  
  if (account) {
    console.log('✅ Conta encontrada!');
    console.log('Email:', account.email);
    console.log('API Key:', account.api_key);
    console.log('Active:', account.is_active);
  } else {
    console.log('❌ Conta não encontrada');
    
    // Vamos buscar sem filtros para debug
    const allAccounts = await Account.findAll();
    console.log('\nTodasas contas no banco:');
    allAccounts.forEach(acc => {
      console.log(`- Email: "${acc.email}" | API Key: "${acc.api_key}" | Active: ${acc.is_active}`);
    });
  }
}

debugLogin().then(() => process.exit(0));
