require('dotenv').config();
const { User, Account, UserAccount } = require('./src/models');
const { sequelize } = require('./src/database/connection');

async function checkAndCreateUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    const email = 'wenendy1@touchorks.com.br';
    const password = '12345678';

    // 1. Verificar se o usuário já existe
    console.log(`🔍 Verificando se usuário ${email} existe...`);

    const existingUser = await User.findOne({
      where: { email: email }
    });

    if (existingUser) {
      console.log('✅ Usuário encontrado:', {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        is_active: existingUser.is_active,
        role: existingUser.role,
        account_id: existingUser.account_id,
        current_account_id: existingUser.current_account_id
      });

      if (!existingUser.is_active) {
        console.log('⚠️ Usuário está inativo. Ativando...');
        await existingUser.update({ is_active: true });
        console.log('✅ Usuário ativado');
      }

      // Verificar se tem conta associada
      if (existingUser.account_id) {
        const account = await Account.findByPk(existingUser.account_id);
        if (account) {
          console.log('✅ Conta principal encontrada:', {
            id: account.id,
            name: account.name,
            is_active: account.is_active
          });

          if (!account.is_active) {
            console.log('⚠️ Conta está inativa. Ativando...');
            await account.update({ is_active: true });
            console.log('✅ Conta ativada');
          }
        } else {
          console.log('❌ Conta principal não encontrada');
        }
      }

      // Verificar UserAccount associations
      const userAccounts = await UserAccount.findAll({
        where: { user_id: existingUser.id },
        include: [{
          model: Account,
          as: 'account'
        }]
      });

      console.log(`📊 Encontradas ${userAccounts.length} associações de conta:`);
      userAccounts.forEach((ua, index) => {
        console.log(`  ${index + 1}. Conta: ${ua.account.name} (ID: ${ua.account.id})`);
        console.log(`     Role: ${ua.role}, User Active: ${ua.is_active}, Account Active: ${ua.account.is_active}`);
      });

      return;
    }

    // 2. Usuário não existe - perguntar se deve criar
    console.log('❌ Usuário não encontrado.');
    console.log('ℹ️ Para criar o usuário, você precisa de uma conta existente.');

    // Listar contas disponíveis
    const accounts = await Account.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'email']
    });

    console.log(`📋 Contas disponíveis (${accounts.length}):`);
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (${account.email}) - ID: ${account.id}`);
    });

    if (accounts.length === 0) {
      console.log('❌ Nenhuma conta ativa encontrada. Crie uma conta primeiro.');
      return;
    }

    // Por enquanto, vamos usar a primeira conta disponível
    const targetAccount = accounts[0];
    console.log(`📝 Criando usuário ${email} na conta: ${targetAccount.name}`);

    const newUser = await User.create({
      name: 'Wenendy Test User',
      email: email,
      password: password, // Será hasheado automaticamente pelo hook
      role: 'member',
      account_id: targetAccount.id,
      current_account_id: targetAccount.id,
      is_active: true
    });

    console.log('✅ Usuário criado com sucesso:', {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });

    // Criar associação UserAccount
    const userAccount = await UserAccount.create({
      user_id: newUser.id,
      account_id: targetAccount.id,
      role: 'member',
      is_active: true,
      permissions: {
        view_leads: true,
        create_leads: true,
        edit_leads: true,
        delete_leads: false,
        view_dashboard: true
      }
    });

    console.log('✅ Associação UserAccount criada');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

checkAndCreateUser();