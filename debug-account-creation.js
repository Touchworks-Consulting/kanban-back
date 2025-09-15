const { Account, User, UserAccount } = require('./src/models');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function testAccountCreation() {
  try {
    console.log('🚀 Testando criação de conta...');

    // Buscar um usuário existente
    const user = await User.findOne({ where: { is_active: true } });
    if (!user) {
      console.error('❌ Nenhum usuário ativo encontrado');
      return;
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.id})`);

    const accountData = {
      name: 'Conta Teste Debug',
      display_name: 'Conta Teste Debug',
      description: 'Conta criada para debug',
      plan: 'free',
      email: `account-${uuidv4().substring(0, 8)}@temp.com`,
      is_active: true,
      api_key: crypto.randomBytes(32).toString('hex'),
      settings: {}
    };

    console.log('📋 Dados da conta:', accountData);

    // Criar nova conta
    console.log('💾 Criando conta...');
    const account = await Account.create(accountData);
    console.log(`✅ Conta criada: ${account.name} (${account.id})`);

    // Criar UserAccount
    console.log('🔗 Criando UserAccount...');
    const userAccount = await UserAccount.create({
      user_id: user.id,
      account_id: account.id,
      role: 'owner',
      is_active: true,
      permissions: {
        manage_users: true,
        manage_settings: true,
        manage_billing: true,
        manage_integrations: true
      }
    });

    console.log(`✅ UserAccount criado: ${userAccount.id}`);
    console.log('🎉 Teste de criação de conta bem-sucedido!');

  } catch (error) {
    console.error('❌ Erro na criação da conta:');
    console.error('Erro principal:', error.message);

    if (error.original) {
      console.error('Erro SQL:', error.original);
    }

    if (error.errors && error.errors.length > 0) {
      console.error('Detalhes dos erros:');
      error.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.message} (campo: ${err.path})`);
      });
    }

    console.error('Stack trace:', error.stack);
  }
}

// Executar teste
testAccountCreation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });