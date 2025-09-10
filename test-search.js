const { Account } = require('./src/models');

async function testSearch() {
  try {
    console.log('🔍 Testando diferentes buscas...');
    
    // 1. Busca apenas por email
    const byEmail = await Account.findOne({
      where: { email: 'admin@example.com' }
    });
    console.log('✅ Busca apenas por email:', !!byEmail);
    
    // 2. Busca apenas por API key
    const byApiKey = await Account.findOne({
      where: { api_key: 'demo_api_key_change_me' }
    });
    console.log('✅ Busca apenas por API key:', !!byApiKey);
    
    // 3. Busca apenas por is_active
    const byActive = await Account.findOne({
      where: { is_active: true }
    });
    console.log('✅ Busca apenas por is_active:', !!byActive);
    
    // 4. Busca email + API key (sem is_active)
    const byEmailAndKey = await Account.findOne({
      where: {
        email: 'admin@example.com',
        api_key: 'demo_api_key_change_me'
      }
    });
    console.log('✅ Busca email + API key:', !!byEmailAndKey);
    
    // 5. Busca completa (igual ao controller)
    const fullSearch = await Account.findOne({
      where: {
        email: 'admin@example.com',
        api_key: 'demo_api_key_change_me',
        is_active: true
      }
    });
    console.log('✅ Busca completa:', !!fullSearch);
    
    if (fullSearch) {
      console.log('✅ ENCONTROU! Dados da conta:', {
        id: fullSearch.id,
        name: fullSearch.name,
        email: fullSearch.email,
        is_active: fullSearch.is_active
      });
    } else {
      console.log('❌ Busca completa falhou');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testSearch();
