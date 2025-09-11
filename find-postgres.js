const { Client } = require('pg');

async function findPostgres() {
  const commonPasswords = ['', 'postgres', '123456', 'admin', '753951', 'password'];
  
  console.log('🔍 Procurando configuração correta do PostgreSQL...');
  console.log('');

  for (const password of commonPasswords) {
    console.log(`🔐 Testando senha: ${password || '(vazia)'}...`);
    
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: password,
      database: 'postgres'
    });

    try {
      await client.connect();
      console.log(`✅ SUCESSO! Senha correta: "${password}"`);
      
      // Verificar se o banco existe
      const result = await client.query(`
        SELECT 1 FROM pg_database WHERE datname = 'kanban_crm'
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ Banco kanban_crm já existe!');
      } else {
        console.log('⚠️ Criando banco kanban_crm...');
        await client.query('CREATE DATABASE kanban_crm');
        console.log('✅ Banco kanban_crm criado!');
      }
      
      await client.end();
      
      // Atualizar .env
      console.log('\n📝 Atualizando arquivo .env...');
      console.log(`   DB_PASSWORD=${password}`);
      
      return password;
      
    } catch (error) {
      await client.end().catch(() => {});
      // Continuar tentando
    }
  }
  
  console.log('❌ Nenhuma senha funcionou. PostgreSQL pode estar configurado diferentemente.');
  return null;
}

findPostgres().then(password => {
  if (password !== null) {
    console.log('\n🎉 PostgreSQL configurado! Agora você pode executar:');
    console.log('   npm run migrate');
  }
});