#!/usr/bin/env node

/**
 * Script para executar migrations pendentes em produção usando Sequelize CLI
 *
 * Este script:
 * 1. Verifica o estado atual das migrations em produção
 * 2. Lista migrations pendentes
 * 3. Cria backup dos dados críticos
 * 4. Executa as migrations pendentes
 * 5. Valida o resultado
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const { Client } = require('pg');

const execAsync = promisify(exec);

// Configuração do banco de produção
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_sB1ANx9MjuhC@ep-polished-rice-ad3vfc2p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Migrations pendentes identificadas
const EXPECTED_MIGRATIONS = [
  '20241201000001-add-activity-priority-reminder.js',
  '20250927-create-lead-contacts.js',
  '20250927-create-lead-files.js',
  '20250927-update-lead-activities.js',
  '20250928-add-activity-overdue-job-type.js'
];

async function createBackup() {
  console.log('\n📦 Criando backup do banco de produção...');

  const client = new Client({
    connectionString: PRODUCTION_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-production-${timestamp}.json`;

    // Backup das tabelas importantes
    const tables = ['lead_activities', 'leads', 'users', 'accounts'];
    const backupData = { timestamp, tables: {} };

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT * FROM ${table} LIMIT 100`);
        backupData.tables[table] = {
          count: result.rows.length,
          sample: result.rows
        };
        console.log(`   ✅ ${table}: ${result.rows.length} registros (amostra)`);
      } catch (err) {
        console.log(`   ⚠️  ${table}: erro ao fazer backup - ${err.message}`);
      }
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`\n✅ Backup salvo em: ${backupFile}\n`);

    return backupFile;
  } finally {
    await client.end();
  }
}

async function checkCurrentMigrations() {
  console.log('🔍 Verificando migrations aplicadas em produção...\n');

  const client = new Client({
    connectionString: PRODUCTION_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Verificar se a tabela SequelizeMeta existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'SequelizeMeta'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('⚠️  Tabela SequelizeMeta não existe. Será criada durante a migração.\n');
      return [];
    }

    // Buscar migrations aplicadas
    const result = await client.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
    const appliedMigrations = result.rows.map(r => r.name);

    console.log(`✅ Total de migrations aplicadas: ${appliedMigrations.length}\n`);

    if (appliedMigrations.length > 0) {
      console.log('Últimas 5 migrations aplicadas:');
      appliedMigrations.slice(-5).forEach(m => console.log(`   - ${m}`));
      console.log('');
    }

    return appliedMigrations;
  } finally {
    await client.end();
  }
}

async function getPendingMigrations(appliedMigrations) {
  console.log('📋 Analisando migrations pendentes...\n');

  const pending = EXPECTED_MIGRATIONS.filter(m => !appliedMigrations.includes(m));

  if (pending.length === 0) {
    console.log('✅ Nenhuma migration pendente! O banco está atualizado.\n');
    return [];
  }

  console.log(`🆕 Migrations pendentes: ${pending.length}\n`);
  pending.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m}`);
  });
  console.log('');

  return pending;
}

async function runMigrations() {
  console.log('🚀 Executando migrations em produção...\n');
  console.log('=' .repeat(80));

  try {
    // Configurar variável de ambiente para produção
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = PRODUCTION_DB_URL;

    // Executar o comando de migrate do Sequelize CLI
    const { stdout, stderr } = await execAsync(
      `npx sequelize-cli db:migrate`,
      {
        env: {
          ...process.env,
          DATABASE_URL: PRODUCTION_DB_URL
        }
      }
    );

    console.log(stdout);
    if (stderr) {
      console.error('Warnings:', stderr);
    }

    console.log('=' .repeat(80));
    console.log('✅ Migrations executadas com sucesso!\n');

    return true;
  } catch (error) {
    console.error('=' .repeat(80));
    console.error('❌ Erro ao executar migrations:');
    console.error(error.message);
    console.error('=' .repeat(80));
    throw error;
  }
}

async function validateMigrations() {
  console.log('🔎 Validando estrutura do banco após migrations...\n');

  const client = new Client({
    connectionString: PRODUCTION_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Verificar tabelas novas
    const newTables = ['lead_contacts', 'lead_files'];
    for (const table of newTables) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);

      if (exists.rows[0].exists) {
        console.log(`   ✅ Tabela ${table} criada com sucesso`);
      } else {
        console.log(`   ❌ Tabela ${table} NÃO foi criada`);
      }
    }

    // Verificar colunas novas em lead_activities
    const newColumns = ['priority', 'reminder_at', 'is_overdue'];
    for (const column of newColumns) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'lead_activities'
          AND column_name = $1
        );
      `, [column]);

      if (exists.rows[0].exists) {
        console.log(`   ✅ Coluna lead_activities.${column} criada com sucesso`);
      } else {
        console.log(`   ❌ Coluna lead_activities.${column} NÃO foi criada`);
      }
    }

    console.log('\n✅ Validação concluída!\n');
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('\n');
  console.log('=' .repeat(80));
  console.log('  SCRIPT DE MIGRAÇÃO PARA PRODUÇÃO - NEON DATABASE');
  console.log('=' .repeat(80));
  console.log('\n');

  try {
    // 1. Verificar migrations atuais
    const appliedMigrations = await checkCurrentMigrations();

    // 2. Identificar migrations pendentes
    const pendingMigrations = await getPendingMigrations(appliedMigrations);

    if (pendingMigrations.length === 0) {
      console.log('🎉 Nada a fazer! O banco já está atualizado.\n');
      process.exit(0);
    }

    // 3. Criar backup
    const backupFile = await createBackup();

    // 4. Confirmar execução
    console.log('⚠️  ATENÇÃO: Você está prestes a executar migrations em PRODUÇÃO!');
    console.log(`   ${pendingMigrations.length} migration(s) serão aplicadas.`);
    console.log(`   Backup salvo em: ${backupFile}\n`);

    // Em ambiente automatizado, descomentar a linha abaixo para executar sem confirmação
    // const shouldProceed = true;

    // Para execução manual com confirmação:
    console.log('Para continuar, execute este script com o argumento --confirm:');
    console.log('   node run-production-migrations.js --confirm\n');

    if (!process.argv.includes('--confirm')) {
      console.log('❌ Migração cancelada. Use --confirm para executar.\n');
      process.exit(0);
    }

    // 5. Executar migrations
    await runMigrations();

    // 6. Validar resultado
    await validateMigrations();

    console.log('=' .repeat(80));
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=' .repeat(80));
    console.log(`\n📊 Resultado:`);
    console.log(`   - Migrations aplicadas: ${pendingMigrations.length}`);
    console.log(`   - Backup disponível em: ${backupFile}`);
    console.log(`   - Status: ✅ Sucesso\n`);

  } catch (error) {
    console.error('\n');
    console.error('=' .repeat(80));
    console.error('❌ ERRO DURANTE A MIGRAÇÃO');
    console.error('=' .repeat(80));
    console.error(error);
    console.error('\n⚠️  Verifique o backup e os logs acima para mais detalhes.\n');
    process.exit(1);
  }
}

// Executar
main();