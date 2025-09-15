const axios = require('axios');
require('dotenv').config();

async function testAccountAPI() {
  try {
    const baseURL = 'http://localhost:3000';
    console.log('🚀 Testando API de contas...');

    // Primeiro, fazer login para obter um token
    console.log('📋 Fazendo login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@example.com', // ou outro usuário válido
      password: 'admin123' // ou senha válida
    });

    const token = loginResponse.data.token;
    console.log('✅ Login bem-sucedido!');

    // Teste criar conta
    console.log('🏢 Testando criação de conta...');
    const accountData = {
      name: 'Teste Conta API',
      display_name: 'Teste Conta API',
      description: 'Conta de teste via API',
      plan: 'free'
    };

    const createResponse = await axios.post(`${baseURL}/api/accounts`, accountData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Conta criada com sucesso!');
    console.log('📋 Dados da conta:', createResponse.data);

  } catch (error) {
    console.error('❌ Erro na requisição:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data);
    console.error('Headers:', error.response?.headers);

    if (error.response?.status === 401) {
      console.log('🔐 Erro de autenticação - verificar credenciais');
    } else if (error.response?.status === 500) {
      console.log('💥 Erro interno do servidor');
    }
  }
}

testAccountAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });