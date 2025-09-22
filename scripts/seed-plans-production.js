const { v4: uuidv4 } = require('uuid');

// Script direto para popular planos em produção
async function seedPlansProduction() {
  const { Sequelize } = require('sequelize');

  // Usar DATABASE_URL diretamente (ambiente de produção)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada. Execute com:');
    console.error('DATABASE_URL="sua-url-do-neon" node scripts/seed-plans-production.js');
    process.exit(1);
  }

  console.log('🔗 Conectando ao banco de produção...');
  console.log('📍 URL:', databaseUrl.replace(/\/\/.*@/, '//***:***@')); // Oculta credenciais

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false // Desabilitar logs SQL para limpar output
  });

  try {
    // Testar conexão
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de produção');

    // Verificar se já existem planos
    const [existingPlans] = await sequelize.query(
      'SELECT COUNT(*) as count FROM plans',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPlans.count > 0) {
      console.log(`ℹ️  Já existem ${existingPlans.count} planos no banco de produção`);

      // Listar os planos existentes
      const [plans] = await sequelize.query(
        'SELECT name, slug, price, is_active FROM plans ORDER BY sort_order, created_at',
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log('\n📋 Planos existentes:');
      plans.forEach((plan, i) => {
        console.log(`   ${i + 1}. ${plan.name} (${plan.slug}) - R$ ${plan.price} - ${plan.is_active ? 'Ativo' : 'Inativo'}`);
      });

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('\n❓ Deseja substituir os planos existentes? (s/N): ', resolve);
      });

      rl.close();

      if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'sim') {
        console.log('✋ Operação cancelada pelo usuário');
        return;
      }

      console.log('🗑️  Removendo planos existentes...');
      await sequelize.query('DELETE FROM plans');
      console.log('✅ Planos existentes removidos');
    }

    console.log('📦 Inserindo novos planos...');

    // Planos do Touch RUN CRM
    const plans = [
      {
        id: uuidv4(),
        name: 'Gratuito',
        slug: 'free',
        description: 'Plano gratuito para começar com o básico',
        price: 0.00,
        max_users: 1,
        max_leads: 100,
        features: JSON.stringify([
          'Até 1 usuário',
          'Até 100 leads por mês',
          'Funil de vendas básico',
          'Relatórios básicos',
          'Suporte por email'
        ]),
        is_active: true,
        is_default: true,
        trial_days: 0,
        stripe_price_id: null,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Starter',
        slug: 'starter',
        description: 'Ideal para pequenas equipes começando com vendas',
        price: 29.90,
        max_users: 3,
        max_leads: 500,
        features: JSON.stringify([
          'Até 3 usuários',
          'Até 500 leads por mês',
          'Funil de vendas completo',
          'Automações básicas',
          'Relatórios avançados',
          'WhatsApp integrado',
          'Suporte prioritário'
        ]),
        is_active: true,
        is_default: false,
        trial_days: 14,
        stripe_price_id: null,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Professional',
        slug: 'professional',
        description: 'Para equipes que precisam de mais poder e flexibilidade',
        price: 79.90,
        max_users: 10,
        max_leads: 2000,
        features: JSON.stringify([
          'Até 10 usuários',
          'Até 2.000 leads por mês',
          'Funil de vendas ilimitado',
          'Automações avançadas',
          'Relatórios personalizados',
          'WhatsApp Business API',
          'Integrações avançadas',
          'Campos customizados',
          'Pipeline personalizado',
          'Suporte premium'
        ]),
        is_active: true,
        is_default: false,
        trial_days: 14,
        stripe_price_id: null,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Solução completa para grandes empresas',
        price: 199.90,
        max_users: null, // ilimitado
        max_leads: null, // ilimitado
        features: JSON.stringify([
          'Usuários ilimitados',
          'Leads ilimitados',
          'Funil de vendas ilimitado',
          'Automações ilimitadas',
          'Relatórios personalizados',
          'WhatsApp Business API',
          'Todas as integrações',
          'API completa',
          'Campos customizados ilimitados',
          'Multi-empresa',
          'Backup automático',
          'SLA garantido',
          'Suporte dedicado',
          'Consultoria especializada'
        ]),
        is_active: true,
        is_default: false,
        trial_days: 30,
        stripe_price_id: null,
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Inserir os planos usando query raw para garantir compatibilidade
    for (const plan of plans) {
      await sequelize.query(`
        INSERT INTO plans (
          id, name, slug, description, price, max_users, max_leads,
          features, is_active, is_default, trial_days, stripe_price_id,
          sort_order, created_at, updated_at
        ) VALUES (
          :id, :name, :slug, :description, :price, :max_users, :max_leads,
          :features, :is_active, :is_default, :trial_days, :stripe_price_id,
          :sort_order, :created_at, :updated_at
        )
      `, {
        replacements: plan,
        type: Sequelize.QueryTypes.INSERT
      });
    }

    console.log(`✅ ${plans.length} planos inseridos com sucesso!`);

    // Listar os planos criados
    console.log('\n🎉 Planos criados:');
    plans.forEach((plan, i) => {
      console.log(`   ${i + 1}. ${plan.name} - R$ ${plan.price}/mês - ${plan.features.length > 50 ? plan.description : JSON.parse(plan.features).length + ' features'}`);
    });

    console.log('\n✅ Seed dos planos concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao popular planos:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedPlansProduction()
    .then(() => {
      console.log('\n🎉 Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Falha na execução do script:', error.message);
      process.exit(1);
    });
}

module.exports = { seedPlansProduction };