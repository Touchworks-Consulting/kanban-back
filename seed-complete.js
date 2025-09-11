require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { 
  Account, 
  User,
  KanbanColumn, 
  Lead,
  Campaign,
  TriggerPhrase,
  WhatsAppAccount 
} = require('./src/models');

async function seedComplete() {
  try {
    console.log('🌱 Iniciando seed completo do PostgreSQL...');

    // 1. Criar conta admin
    const adminAccountId = uuidv4();
    const adminAccount = await Account.create({
      id: adminAccountId,
      name: 'Admin Account',
      email: 'admin@admin.com',
      api_key: 'admin123',
      is_active: true,
      settings: {}
    });
    console.log('✅ Conta admin criada');

    // 2. Criar usuário admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      account_id: adminAccountId,
      name: 'Administrador',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'owner',
      is_active: true
    });
    console.log('✅ Usuário admin criado');

    // 3. Criar colunas do kanban
    const columns = [
      { 
        name: 'Leads Entrantes', 
        position: 0, 
        color: '#3b82f6', 
        is_system: true 
      },
      { 
        name: 'Contactado', 
        position: 1, 
        color: '#f59e0b', 
        is_system: false 
      },
      { 
        name: 'Qualificado', 
        position: 2, 
        color: '#8b5cf6', 
        is_system: false 
      },
      { 
        name: 'Proposta', 
        position: 3, 
        color: '#06b6d4', 
        is_system: false 
      },
      { 
        name: 'Ganhos', 
        position: 4, 
        color: '#10b981', 
        is_system: false 
      },
      { 
        name: 'Perdidos', 
        position: 5, 
        color: '#ef4444', 
        is_system: false 
      }
    ];

    const createdColumns = [];
    for (const col of columns) {
      const column = await KanbanColumn.create({
        account_id: adminAccountId,
        ...col
      });
      createdColumns.push(column);
    }
    console.log('✅ Colunas do kanban criadas');

    // 4. Criar campanhas
    const campaigns = [
      {
        name: 'Vendas Online - Meta',
        platform: 'Meta',
        channel: 'Instagram',
        creative_code: 'CR001',
        description: 'Campanha de vendas para Instagram',
        budget: 1500.00,
        is_active: true
      },
      {
        name: 'Curso de Marketing - Google',
        platform: 'Google',
        channel: 'Google Ads',
        creative_code: 'CR002',
        description: 'Campanha de curso via Google Ads',
        budget: 2000.00,
        is_active: true
      },
      {
        name: 'Consultoria Empresarial - Meta',
        platform: 'Meta',
        channel: 'Facebook',
        creative_code: 'CR003',
        description: 'Campanha de consultoria para Facebook',
        budget: 3000.00,
        is_active: true
      }
    ];

    const createdCampaigns = [];
    for (const camp of campaigns) {
      const campaign = await Campaign.create({
        account_id: adminAccountId,
        ...camp
      });
      createdCampaigns.push(campaign);
    }
    console.log('✅ Campanhas criadas');

    // 5. Criar frases gatilho
    const triggerPhrases = [
      {
        campaign_id: createdCampaigns[0].id, // Vendas Online
        phrase: 'Vi seu anúncio sobre vendas',
        keywords: ['anuncio', 'vendas', 'anúncio', 'venda'],
        priority: 1,
        match_type: 'keyword'
      },
      {
        campaign_id: createdCampaigns[0].id, // Vendas Online
        phrase: 'Olá, vim pelo Instagram',
        keywords: ['instagram', 'insta', 'story', 'stories'],
        priority: 2,
        match_type: 'keyword'
      },
      {
        campaign_id: createdCampaigns[1].id, // Curso Marketing
        phrase: 'Quero saber sobre o curso',
        keywords: ['curso', 'marketing', 'aprender', 'aula'],
        priority: 1,
        match_type: 'keyword'
      },
      {
        campaign_id: createdCampaigns[2].id, // Consultoria
        phrase: 'Preciso de consultoria',
        keywords: ['consultoria', 'ajuda', 'empresa', 'consultor'],
        priority: 1,
        match_type: 'keyword'
      }
    ];

    for (const phrase of triggerPhrases) {
      await TriggerPhrase.create({
        account_id: adminAccountId,
        ...phrase
      });
    }
    console.log('✅ Frases gatilho criadas');

    // 6. Criar conta WhatsApp de exemplo
    const whatsappAccount = await WhatsAppAccount.create({
      account_id: adminAccountId,
      phone_id: '123456789',
      account_name: 'Empresa Principal',
      phone_number: '+5511999999999',
      is_active: true
    });
    console.log('✅ Conta WhatsApp criada');

    // 7. Criar alguns leads de exemplo
    const sampleLeads = [
      {
        name: 'João Silva',
        phone: '11999999999',
        email: 'joao@example.com',
        platform: 'Instagram',
        campaign: 'Vendas Online - Meta',
        message: 'Vi seu anúncio sobre vendas online',
        status: 'new',
        column_id: createdColumns[0].id,
        position: 0,
        value: 1500.00
      },
      {
        name: 'Maria Souza',
        phone: '11888888888',
        email: 'maria@example.com',
        platform: 'Google',
        campaign: 'Curso de Marketing - Google',
        message: 'Quero saber mais sobre o curso de marketing',
        status: 'new',
        column_id: createdColumns[0].id,
        position: 1,
        value: 800.00
      },
      {
        name: 'Empresa XYZ',
        phone: '1133334444',
        email: 'contato@empresaxyz.com',
        platform: 'Facebook',
        campaign: 'Consultoria Empresarial - Meta',
        message: 'Preciso de consultoria para minha empresa',
        status: 'contacted',
        column_id: createdColumns[1].id,
        position: 0,
        value: 5000.00
      }
    ];

    for (const lead of sampleLeads) {
      await Lead.create({
        account_id: adminAccountId,
        ...lead,
        metadata: {
          source: 'seed',
          created_by: 'system'
        }
      });
    }
    console.log('✅ Leads de exemplo criados');

    console.log('\n🎉 Seed completo finalizado!');
    console.log('\n📋 Resumo criado:');
    console.log(`   📧 Email: admin@admin.com`);
    console.log(`   🔑 Senha: admin123`);
    console.log(`   🔐 API Key: admin123`);
    console.log(`   📱 WhatsApp ID: 123456789`);
    console.log(`   🎯 Campanhas: ${createdCampaigns.length}`);
    console.log(`   💬 Frases: ${triggerPhrases.length}`);
    console.log(`   📋 Colunas: ${createdColumns.length}`);
    console.log(`   👥 Leads: ${sampleLeads.length}`);

  } catch (error) {
    console.error('❌ Erro no seed:', error);
  }
}

seedComplete();