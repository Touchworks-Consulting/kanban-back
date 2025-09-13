require('dotenv').config();
const { User, Account, UserAccount } = require('./src/models');
const { sequelize } = require('./src/database/connection');

async function debugUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // 1. Listar todas as contas
    console.log('\n📋 CONTAS EXISTENTES:');
    const accounts = await Account.findAll({
      attributes: ['id', 'name', 'email', 'is_active']
    });

    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (${account.email}) - ID: ${account.id} - Ativo: ${account.is_active}`);
    });

    // 2. Listar todos os usuários
    console.log('\n👤 USUÁRIOS EXISTENTES:');
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'account_id', 'current_account_id', 'is_active'],
      order: [['email', 'ASC']]
    });

    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Account ID: ${user.account_id}`);
      console.log(`     Current Account ID: ${user.current_account_id}`);
      console.log(`     Ativo: ${user.is_active}`);
      console.log('');
    });

    // 3. Verificar duplicações por email
    console.log('\n🔍 VERIFICANDO DUPLICAÇÕES POR EMAIL:');
    const emailGroups = {};
    users.forEach(user => {
      const email = user.email.toLowerCase();
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push(user);
    });

    Object.entries(emailGroups).forEach(([email, userList]) => {
      if (userList.length > 1) {
        console.log(`❌ EMAIL DUPLICADO: ${email} (${userList.length} usuários)`);
        userList.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name} - ID: ${user.id} - Role: ${user.role} - Account: ${user.account_id}`);
        });
        console.log('');
      }
    });

    // 4. Listar todas as associações UserAccount
    console.log('\n🔗 ASSOCIAÇÕES USERACCOUNT:');
    const userAccounts = await UserAccount.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    userAccounts.forEach((ua, index) => {
      console.log(`  ${index + 1}. User: ${ua.user.name} (${ua.user.email})`);
      console.log(`     Account: ${ua.account.name} (${ua.account.email})`);
      console.log(`     Role: ${ua.role}, Ativo: ${ua.is_active}`);
      console.log(`     Permissions: ${JSON.stringify(ua.permissions)}`);
      console.log('');
    });

    // 5. Verificar usuários sem associações UserAccount
    console.log('\n⚠️ USUÁRIOS SEM ASSOCIAÇÕES USERACCOUNT:');
    for (const user of users) {
      const hasAssociation = userAccounts.some(ua => ua.user.id === user.id);
      if (!hasAssociation) {
        console.log(`❌ ${user.name} (${user.email}) - ID: ${user.id}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

debugUsers();