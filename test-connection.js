require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Testando configurações de conexão...');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'não definida'}`);
  console.log('');

  // Teste 1: Conexão com banco padrão
  console.log('📡 Teste 1: Conectando ao PostgreSQL...');
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // usar banco padrão primeiro
  });

  try {
    await client.connect();
    console.log('✅ Conexão com PostgreSQL estabelecida!');
    
    // Verificar se o banco existe
    const result = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [process.env.DB_NAME || 'kanban_crm']);
    
    if (result.rows.length > 0) {
      console.log(`✅ Banco '${process.env.DB_NAME}' já existe!`);
    } else {
      console.log(`⚠️ Banco '${process.env.DB_NAME}' não existe, criando...`);
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'kanban_crm'}`);
      console.log(`✅ Banco '${process.env.DB_NAME}' criado!`);
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 PostgreSQL não está rodando ou não está acessível na porta 5432');
    } else if (error.code === '28P01') {
      console.error('💡 Erro de autenticação - verifique usuário/senha');
    }
    
    process.exit(1);
  }
  
  // Teste 2: Conexão com o banco do projeto
  console.log('\n📡 Teste 2: Conectando ao banco do projeto...');
  const projectClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'kanban_crm'
  });

  try {
    await projectClient.connect();
    console.log('✅ Conexão com banco do projeto estabelecida!');
    
    // Verificar versão
    const versionResult = await projectClient.query('SELECT version()');
    console.log(`📊 PostgreSQL: ${versionResult.rows[0].version.split(' ')[0]} ${versionResult.rows[0].version.split(' ')[1]}`);
    
    await projectClient.end();
    console.log('\n🎉 Todas as conexões funcionaram! Você pode executar as migrações.');
    
  } catch (error) {
    console.error('❌ Erro na conexão com banco do projeto:', error.message);
    process.exit(1);
  }
}

testConnection();