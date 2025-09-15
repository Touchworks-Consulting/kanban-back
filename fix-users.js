require('dotenv').config();
const { User, Account, UserAccount } = require('./src/models');
const { sequelize } = require('./src/database/connection');

async function fixUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Identificar o usuário problemático
    const problematicUser = await User.findOne({
      where: { email: 'wenendy1@touchworks.com.br' }
    });

    if (!problematicUser) {
      console.log('❌ Usuário wenendy1@touchworks.com.br não encontrado');
      return;
    }

    console.log('🔍 Usuário problemático encontrado:', {
      id: problematicUser.id,
      name: problematicUser.name,
      email: problematicUser.email,
      account_id: problematicUser.account_id,
      current_account_id: problematicUser.current_account_id
    });

    // Verificar se já existe associação UserAccount
    const existingAssociation = await UserAccount.findOne({
      where: { user_id: problematicUser.id }
    });

    if (existingAssociation) {
      console.log('✅ Usuário já possui associação UserAccount');
      return;
    }

    console.log('⚠️ Usuário não possui associação UserAccount. Criando...');

    // Verificar se a conta existe
    const account = await Account.findByPk(problematicUser.account_id);
    if (!account) {
      console.log('❌ Conta não encontrada:', problematicUser.account_id);
      return;
    }

    console.log('✅ Conta encontrada:', {
      id: account.id,
      name: account.name,
      email: account.email
    });

    // Criar associação UserAccount
    const userAccount = await UserAccount.create({
      user_id: problematicUser.id,
      account_id: problematicUser.account_id,
      role: 'member', // Manter como member
      is_active: true,
      permissions: {
        view_leads: true,
        create_leads: true,
        edit_leads: true,
        delete_leads: false,
        view_dashboard: true
      }
    });

    console.log('✅ Associação UserAccount criada:', {
      id: userAccount.id,
      user_id: userAccount.user_id,
      account_id: userAccount.account_id,
      role: userAccount.role
    });

    // Atualizar current_account_id se estiver null
    if (!problematicUser.current_account_id) {
      await problematicUser.update({
        current_account_id: problematicUser.account_id
      });
      console.log('✅ current_account_id atualizado');
    }

    // Verificar se agora o login funciona
    console.log('\n🔐 Testando login do usuário...');
    console.log(`Email: ${problematicUser.email}`);
    console.log('Senha: 12345678 (padrão)');

    // Testar validação de senha (precisa de senha hash para comparar)
    console.log('⚠️ Para testar o login completo, execute:');
    console.log(`curl -X POST -H "Content-Type: application/json" -d '{"email":"${problematicUser.email}","password":"12345678"}' http://localhost:3000/api/auth/login`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

fixUsers();