require('dotenv').config();
const { sequelize } = require('./src/database/connection');
const Plan = require('./src/models/Plan');

async function seedPlans() {
  try {
    console.log('🌱 Iniciando seed dos planos...');

    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Sincronizar modelos (criar tabelas se necessário)
    await sequelize.sync();
    console.log('✅ Tabelas sincronizadas');

    // Dados dos planos
    const plansData = [
      {
        name: 'Beta Gratuito',
        slug: 'beta',
        description: 'Acesso completo durante o período beta - totalmente gratuito!',
        price: 0.00,
        max_users: null, // ilimitado
        max_leads: null, // ilimitado
        features: [
          { name: 'Usuários ilimitados', included: true },
          { name: 'Leads ilimitados', included: true },
          { name: 'Dashboard completo', included: true },
          { name: 'Kanban boards', included: true },
          { name: 'Automações', included: true },
          { name: 'Webhooks', included: true },
          { name: 'Relatórios avançados', included: true },
          { name: 'Suporte prioritário', included: true }
        ],
        is_active: true,
        is_default: true,
        trial_days: 365, // 1 ano de beta
        sort_order: 0
      },
      {
        name: 'Starter',
        slug: 'starter',
        description: 'Perfeito para equipes pequenas começando',
        price: 29.00,
        max_users: 3,
        max_leads: 1000,
        features: [
          { name: 'Até 3 usuários', included: true },
          { name: 'Até 1.000 leads/mês', included: true },
          { name: 'Dashboard básico', included: true },
          { name: 'Kanban boards', included: true },
          { name: 'Automações básicas', included: true },
          { name: 'Webhooks', included: true },
          { name: 'Relatórios básicos', included: true },
          { name: 'Suporte por email', included: true }
        ],
        is_active: false, // Desativado durante beta
        is_default: false,
        trial_days: 14,
        sort_order: 1
      },
      {
        name: 'Professional',
        slug: 'professional',
        description: 'Para equipes em crescimento que precisam de mais recursos',
        price: 79.00,
        max_users: 10,
        max_leads: 5000,
        features: [
          { name: 'Até 10 usuários', included: true },
          { name: 'Até 5.000 leads/mês', included: true },
          { name: 'Dashboard completo', included: true },
          { name: 'Kanban avançado', included: true },
          { name: 'Automações avançadas', included: true },
          { name: 'Webhooks ilimitados', included: true },
          { name: 'Relatórios avançados', included: true },
          { name: 'API completa', included: true },
          { name: 'Suporte prioritário', included: true }
        ],
        is_active: false, // Desativado durante beta
        is_default: false,
        trial_days: 14,
        sort_order: 2
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Para grandes equipes com necessidades específicas - Mínimo de 10 usuários',
        price: 199.00,
        max_users: null, // ilimitado
        max_leads: null, // ilimitado
        features: [
          { name: 'Usuários ilimitados', included: true },
          { name: 'Leads ilimitados', included: true },
          { name: 'Dashboard personalizado', included: true },
          { name: 'Kanban personalizado', included: true },
          { name: 'Automações customizadas', included: true },
          { name: 'Integrações personalizadas', included: true },
          { name: 'White-label', included: true },
          { name: 'SLA garantido', included: true },
          { name: 'Gerente de conta dedicado', included: true }
        ],
        is_active: false, // Desativado durante beta
        is_default: false,
        trial_days: 30,
        sort_order: 3
      }
    ];

    // Limpar planos existentes (apenas em desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      await Plan.destroy({ where: {}, truncate: true });
      console.log('🗑️ Planos existentes removidos (desenvolvimento)');
    }

    // Inserir planos
    for (const planData of plansData) {
      const existingPlan = await Plan.findOne({ where: { slug: planData.slug } });

      if (!existingPlan) {
        await Plan.create(planData);
        console.log(`✅ Plano "${planData.name}" criado`);
      } else {
        await existingPlan.update(planData);
        console.log(`🔄 Plano "${planData.name}" atualizado`);
      }
    }

    console.log('🎉 Seed dos planos concluído com sucesso!');

    // Listar planos criados
    const plans = await Plan.findAll({
      order: [['sort_order', 'ASC']],
      attributes: ['id', 'name', 'slug', 'price', 'max_users', 'max_leads', 'is_active']
    });

    console.log('\n📋 Planos no banco de dados:');
    console.table(plans.map(p => ({
      ID: p.id.substring(0, 8) + '...',
      Nome: p.name,
      Slug: p.slug,
      Preço: `R$ ${p.price}`,
      'Max Usuários': p.max_users || 'Ilimitado',
      'Max Leads': p.max_leads || 'Ilimitado',
      Ativo: p.is_active ? '✅' : '❌'
    })));

  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('📡 Conexão com banco fechada');
    process.exit(0);
  }
}

// Executar o seed
if (require.main === module) {
  seedPlans();
}

module.exports = seedPlans;