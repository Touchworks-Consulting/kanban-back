const { Account } = require('./src/models');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  try {
    // Verificar se já existe um usuário com este email
    const existingUser = await Account.findOne({ 
      where: { email: 'admin@teste.com' } 
    });

    if (existingUser) {
      console.log('✅ Usuário já existe:');
      console.log('📧 Email:', existingUser.email);
      console.log('🔑 API Key:', existingUser.api_key);
      console.log('🆔 ID:', existingUser.id);
      process.exit(0);
    }

    // Criar novo usuário de teste
    const testUser = await Account.create({
      id: uuidv4(),
      name: 'Administrador',
      email: 'admin@teste.com',
      api_key: 'teste123',
      is_active: true,
      settings: {}
    });

    console.log('✅ Usuário de teste criado com sucesso:');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 API Key:', testUser.api_key);
    console.log('🆔 ID:', testUser.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    process.exit(1);
  }
}

createTestUser();
