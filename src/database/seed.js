const { v4: uuidv4 } = require('uuid');
const { Account, KanbanColumn, Tag, PlatformConfig, CronJob, Automation } = require('../models');

async function seed() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Verificar se já existe conta padrão
    const existingAccount = await Account.findOne({
      where: { email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com' }
    });

    if (existingAccount) {
      console.log('ℹ️ Conta padrão já existe, pulando seed');
      return;
    }

    // Criar conta padrão
    const defaultAccount = await Account.create({
      id: uuidv4(),
      name: 'Conta Demonstração',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
      api_key: process.env.DEFAULT_ADMIN_API_KEY || 'demo_api_key_change_me',
      is_active: true,
      settings: {
        theme: 'light',
        timezone: 'America/Sao_Paulo',
        notifications: {
          email: true,
          newLead: true
        }
      }
    });

    console.log('✅ Conta padrão criada');

    // Criar colunas padrão do kanban
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
        color: '#f59e0b'
      },
      {
        name: 'Qualificado',
        position: 2,
        color: '#8b5cf6'
      },
      {
        name: 'Proposta',
        position: 3,
        color: '#06b6d4'
      },
      {
        name: 'Ganhos',
        position: 4,
        color: '#10b981'
      },
      {
        name: 'Perdidos',
        position: 5,
        color: '#ef4444'
      }
    ];

    for (const columnData of columns) {
      await KanbanColumn.create({
        ...columnData,
        account_id: defaultAccount.id
      });
    }

    console.log('✅ Colunas padrão criadas');

    // Criar tags padrão
    const tags = [
      { name: 'Urgente', color: '#ef4444' },
      { name: 'VIP', color: '#8b5cf6' },
      { name: 'Retorno', color: '#f59e0b' },
      { name: 'Qualificado', color: '#10b981' },
      { name: 'Acompanhar', color: '#06b6d4' }
    ];

    for (const tagData of tags) {
      await Tag.create({
        ...tagData,
        account_id: defaultAccount.id
      });
    }

    console.log('✅ Tags padrão criadas');

    // Criar configurações de plataforma padrão
    const platformConfigs = [
      { phrase: 'interessado no curso', campaign: 'Curso Online', platform: 'facebook' },
      { phrase: 'quero saber mais', campaign: 'Geral', platform: 'instagram' },
      { phrase: 'orçamento', campaign: 'Orçamento', platform: 'google' },
      { phrase: 'consultoria', campaign: 'Consultoria', platform: 'linkedin' },
      { phrase: 'demonstração', campaign: 'Demo', platform: 'whatsapp' }
    ];

    for (const configData of platformConfigs) {
      await PlatformConfig.create({
        ...configData,
        account_id: defaultAccount.id
      });
    }

    console.log('✅ Configurações de plataforma criadas');

    // Criar cron jobs de exemplo
    const cronJobs = [
      {
        name: 'Limpeza de Dados Diária',
        description: 'Remove execuções antigas de cron jobs e automações',
        type: 'data_cleanup',
        cron_expression: '0 2 * * *', // Todo dia às 2h
        conditions: { days_old: 30 },
        actions: {},
        is_active: false // Inativo por padrão
      },
      {
        name: 'Pontuação de Leads',
        description: 'Calcula pontuação de todos os leads baseado em critérios',
        type: 'lead_scoring',
        cron_expression: '0 */6 * * *', // A cada 6 horas
        conditions: {},
        actions: {},
        is_active: false
      },
      {
        name: 'Atualização de Status - Leads Antigos',
        description: 'Atualiza status de leads que estão há muito tempo em "novo"',
        type: 'status_update',
        cron_expression: '0 9 * * 1', // Segunda-feira às 9h
        conditions: { 
          from_status: 'new',
          days_in_status: 7 
        },
        actions: { 
          to_status: 'contacted' 
        },
        is_active: false
      }
    ];

    for (const jobData of cronJobs) {
      await CronJob.create({
        ...jobData,
        account_id: defaultAccount.id
      });
    }

    console.log('✅ Cron jobs de exemplo criados');

    // Criar automações de exemplo
    const automations = [
      {
        name: 'Boas-vindas para Lead do Google',
        description: 'Adiciona tag VIP para leads vindos do Google',
        trigger_type: 'lead_created',
        trigger_conditions: {
          platform: 'google'
        },
        actions: [
          {
            type: 'add_tag',
            value: null // Será preenchido com ID da tag VIP
          }
        ],
        priority: 10,
        delay_minutes: 0,
        is_active: false
      },
      {
        name: 'Mover para Qualificado',
        description: 'Move lead para coluna "Qualificado" quando status muda para "qualified"',
        trigger_type: 'status_changed',
        trigger_conditions: {
          to_status: 'qualified'
        },
        actions: [
          {
            type: 'move_lead_column',
            value: null // Será preenchido com ID da coluna Qualificado
          }
        ],
        priority: 5,
        delay_minutes: 0,
        is_active: false
      },
      {
        name: 'Acompanhamento Automático',
        description: 'Adiciona nota de acompanhamento após 24h',
        trigger_type: 'lead_created',
        trigger_conditions: {},
        actions: [
          {
            type: 'update_lead_field',
            field: 'notes',
            value: 'Acompanhamento automático: Lead criado há 24h'
          }
        ],
        priority: 1,
        delay_minutes: 1440, // 24 horas
        is_active: false
      }
    ];

    // Buscar IDs necessários para as automações
    const vipTag = await Tag.findOne({
      where: { name: 'VIP', account_id: defaultAccount.id }
    });

    const qualifiedColumn = await KanbanColumn.findOne({
      where: { name: 'Qualificado', account_id: defaultAccount.id }
    });

    // Preencher IDs nas automações
    if (vipTag) {
      automations[0].actions[0].value = vipTag.id;
    }

    if (qualifiedColumn) {
      automations[1].actions[0].value = qualifiedColumn.id;
    }

    for (const automationData of automations) {
      await Automation.create({
        ...automationData,
        account_id: defaultAccount.id
      });
    }

    console.log('✅ Automações de exemplo criadas');

    console.log('🎉 Seed concluído!');
    console.log(`📧 Email de login: ${defaultAccount.email}`);
    console.log(`🔑 API Key: ${defaultAccount.api_key}`);
    console.log('⚠️ IMPORTANTE: Altere a API key em produção!');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seed().then(() => {
    process.exit(0);
  });
}

module.exports = seed;
