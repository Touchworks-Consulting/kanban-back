const { sequelize } = require('../src/database/connection');
const Plan = require('../src/models/Plan');

async function listPlans() {
  try {
    console.log('🔍 Conectando ao banco de dados...');
    await sequelize.authenticate();

    console.log('📋 Buscando planos existentes...');
    const plans = await Plan.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    });

    if (plans.length === 0) {
      console.log('❌ Nenhum plano encontrado no banco de dados');
      return;
    }

    console.log(`✅ Encontrados ${plans.length} planos:`);
    console.log('\n' + '='.repeat(80));

    plans.forEach((plan, index) => {
      console.log(`\n📦 Plano ${index + 1}: ${plan.name}`);
      console.log(`   🆔 ID: ${plan.id}`);
      console.log(`   🏷️  Slug: ${plan.slug}`);
      console.log(`   📝 Descrição: ${plan.description || 'N/A'}`);
      console.log(`   💰 Preço: R$ ${plan.price}/mês`);
      console.log(`   👥 Máx. Usuários: ${plan.max_users || 'Ilimitado'}`);
      console.log(`   📞 Máx. Leads: ${plan.max_leads || 'Ilimitado'}`);
      console.log(`   🔧 Features: ${JSON.stringify(plan.features)}`);
      console.log(`   ✅ Ativo: ${plan.is_active ? 'Sim' : 'Não'}`);
      console.log(`   ⭐ Padrão: ${plan.is_default ? 'Sim' : 'Não'}`);
      console.log(`   📅 Trial: ${plan.trial_days} dias`);
      console.log(`   💳 Stripe ID: ${plan.stripe_price_id || 'N/A'}`);
      console.log(`   📊 Ordem: ${plan.sort_order}`);
      console.log(`   📅 Criado em: ${plan.createdAt}`);
    });

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Erro ao buscar planos:', error);
  } finally {
    await sequelize.close();
  }
}

listPlans();