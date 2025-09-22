const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se já existem planos para evitar duplicatas
    const existingPlans = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM plans',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPlans[0].count > 0) {
      console.log('✅ Planos já existem no banco, pulando seed');
      return;
    }

    console.log('📦 Inserindo planos padrão...');

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

    await queryInterface.bulkInsert('plans', plans);
    console.log(`✅ ${plans.length} planos inseridos com sucesso!`);
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️  Removendo planos padrão...');

    await queryInterface.sequelize.query(
      'DELETE FROM plans WHERE slug IN (?, ?, ?, ?)',
      {
        replacements: ['free', 'starter', 'professional', 'enterprise'],
        type: Sequelize.QueryTypes.DELETE
      }
    );

    console.log('✅ Planos padrão removidos!');
  }
};