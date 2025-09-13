'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar índices para otimizar as consultas de busca no modelo Lead
    
    // Índice para busca por texto (name, email, phone, campaign, message)
    await queryInterface.addIndex('Lead', ['name'], {
      name: 'idx_leads_name'
    });
    
    await queryInterface.addIndex('Lead', ['email'], {
      name: 'idx_leads_email'
    });
    
    await queryInterface.addIndex('Lead', ['phone'], {
      name: 'idx_leads_phone'
    });
    
    await queryInterface.addIndex('Lead', ['campaign'], {
      name: 'idx_leads_campaign'
    });
    
    // Índice para filtros de platform e status
    await queryInterface.addIndex('Lead', ['platform'], {
      name: 'idx_leads_platform'
    });
    
    await queryInterface.addIndex('Lead', ['status'], {
      name: 'idx_leads_status'
    });
    
    // Índice para filtros de valor
    await queryInterface.addIndex('Lead', ['value'], {
      name: 'idx_leads_value'
    });
    
    // Índices para filtros de data
    await queryInterface.addIndex('Lead', ['created_at'], {
      name: 'idx_leads_created_at'
    });
    
    await queryInterface.addIndex('Lead', ['updated_at'], {
      name: 'idx_leads_updated_at'
    });
    
    // Índices compostos para consultas otimizadas
    await queryInterface.addIndex('Lead', ['account_id', 'column_id'], {
      name: 'idx_leads_account_column'
    });
    
    await queryInterface.addIndex('Lead', ['account_id', 'created_at'], {
      name: 'idx_leads_account_created'
    });
    
    await queryInterface.addIndex('Lead', ['account_id', 'platform'], {
      name: 'idx_leads_account_platform'
    });
    
    await queryInterface.addIndex('Lead', ['account_id', 'status'], {
      name: 'idx_leads_account_status'
    });
    
    // Índice composto para busca de texto com account_id
    await queryInterface.addIndex('Lead', ['account_id', 'name'], {
      name: 'idx_leads_account_name'
    });
    
    await queryInterface.addIndex('Lead', ['account_id', 'email'], {
      name: 'idx_leads_account_email'
    });
    
    await queryInterface.addIndex('Lead', ['account_id', 'phone'], {
      name: 'idx_leads_account_phone'
    });
    
    // Índice para ordenação por position
    await queryInterface.addIndex('Lead', ['column_id', 'position'], {
      name: 'idx_leads_column_position'
    });
    
    // Adicionar índices para tags
    await queryInterface.addIndex('LeadTag', ['lead_id'], {
      name: 'idx_lead_tags_lead'
    });
    
    await queryInterface.addIndex('LeadTag', ['tag_id'], {
      name: 'idx_lead_tags_tag'
    });
    
    // Índice composto para junction table
    await queryInterface.addIndex('LeadTag', ['lead_id', 'tag_id'], {
      name: 'idx_lead_tags_composite',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover todos os índices criados
    await queryInterface.removeIndex('Lead', 'idx_leads_name');
    await queryInterface.removeIndex('Lead', 'idx_leads_email');
    await queryInterface.removeIndex('Lead', 'idx_leads_phone');
    await queryInterface.removeIndex('Lead', 'idx_leads_campaign');
    await queryInterface.removeIndex('Lead', 'idx_leads_platform');
    await queryInterface.removeIndex('Lead', 'idx_leads_status');
    await queryInterface.removeIndex('Lead', 'idx_leads_value');
    await queryInterface.removeIndex('Lead', 'idx_leads_created_at');
    await queryInterface.removeIndex('Lead', 'idx_leads_updated_at');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_column');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_created');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_platform');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_status');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_name');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_email');
    await queryInterface.removeIndex('Lead', 'idx_leads_account_phone');
    await queryInterface.removeIndex('Lead', 'idx_leads_column_position');
    await queryInterface.removeIndex('LeadTag', 'idx_lead_tags_lead');
    await queryInterface.removeIndex('LeadTag', 'idx_lead_tags_tag');
    await queryInterface.removeIndex('LeadTag', 'idx_lead_tags_composite');
  }
};