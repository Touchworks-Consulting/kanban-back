// Script para verificar os planos existentes no banco de produção
async function checkPlansProduction() {
  const { Sequelize } = require('sequelize');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada. Execute com:');
    console.error('DATABASE_URL="sua-url-do-neon" node scripts/check-plans-production.js');
    process.exit(1);
  }

  console.log('🔗 Conectando ao banco de produção...');

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de produção');

    // Verificar estrutura da tabela plans
    console.log('\n📋 Verificando estrutura da tabela plans...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'plans'
      ORDER BY ordinal_position
    `);

    console.log('\n🏗️  Estrutura da tabela:');
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });

    // Buscar todos os planos com todas as colunas
    console.log('\n📦 Buscando planos existentes...');
    const [plans] = await sequelize.query(`
      SELECT
        id, name, slug, description, price, max_users, max_leads,
        features, is_active, is_default, trial_days, stripe_price_id,
        sort_order, created_at, updated_at
      FROM plans
      ORDER BY sort_order, created_at
    `);

    if (plans.length === 0) {
      console.log('❌ Nenhum plano encontrado no banco');
      return;
    }

    console.log(`\n✅ Encontrados ${plans.length} planos:\n`);

    plans.forEach((plan, i) => {
      console.log(`📦 Plano ${i + 1}: ${plan.name}`);
      console.log(`   🆔 ID: ${plan.id}`);
      console.log(`   🏷️  Slug: ${plan.slug}`);
      console.log(`   📝 Descrição: ${plan.description || '❌ VAZIO'}`);
      console.log(`   💰 Preço: R$ ${plan.price}`);
      console.log(`   👥 Máx. Usuários: ${plan.max_users || 'Ilimitado'}`);
      console.log(`   📞 Máx. Leads: ${plan.max_leads || 'Ilimitado'}`);
      console.log(`   🔧 Features: ${plan.features ? (typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features)) : '❌ VAZIO'}`);
      console.log(`   ✅ Ativo: ${plan.is_active}`);
      console.log(`   ⭐ Padrão: ${plan.is_default}`);
      console.log(`   📅 Trial: ${plan.trial_days} dias`);
      console.log(`   💳 Stripe ID: ${plan.stripe_price_id || 'Nulo'}`);
      console.log(`   📊 Ordem: ${plan.sort_order}`);
      console.log(`   📅 Criado: ${plan.created_at}`);
      console.log(`   🔄 Atualizado: ${plan.updated_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkPlansProduction()
    .then(() => {
      console.log('✅ Verificação concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na verificação:', error.message);
      process.exit(1);
    });
}

module.exports = { checkPlansProduction };