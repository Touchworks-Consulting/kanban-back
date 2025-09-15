const { Account } = require('./src/models');

async function checkEmail() {
  try {
    const account = await Account.findOne();
    if (account) {
      console.log('Conta encontrada:');
      console.log('Email atual:', JSON.stringify(account.email));
      console.log('Email length:', account.email.length);
      console.log('API Key:', JSON.stringify(account.api_key));
      console.log('API Key length:', account.api_key.length);
      console.log('Is Active:', account.is_active);
      
      // Verificar se o email já está em lowercase
      console.log('Email em lowercase:', account.email.toLowerCase());
      console.log('É igual?:', account.email === account.email.toLowerCase());
    } else {
      console.log('Nenhuma conta encontrada');
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkEmail();
