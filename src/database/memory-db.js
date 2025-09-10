// Banco de dados em memória para desenvolvimento
const CampaignModels = require('./campaign-models');

class MemoryDatabase {
  constructor() {
    this.accounts = new Map();
    this.leads = new Map();
    this.columns = new Map();
    this.tags = new Map();
    this.leadTags = new Map();
    
    // Inicializar modelos de campanhas
    this.campaigns = new CampaignModels(this);
    
    // Criar dados de exemplo
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Criar conta admin
    const adminAccount = {
      id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
      name: 'Admin',
      email: 'admin@admin.com',
      api_key: 'admin123',
      password: '$2b$10$hash_example', // senha: admin123
      is_active: true,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.accounts.set(adminAccount.id, adminAccount);

    // Criar colunas padrão
    const defaultColumns = [
      { 
        id: 'col-1', 
        account_id: adminAccount.id, 
        name: 'Leads Entrantes', 
        position: 0, 
        color: '#3b82f6', 
        is_system: true, 
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 'col-2', 
        account_id: adminAccount.id, 
        name: 'Contactado', 
        position: 1, 
        color: '#f59e0b', 
        is_system: false, 
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 'col-3', 
        account_id: adminAccount.id, 
        name: 'Qualificado', 
        position: 2, 
        color: '#8b5cf6', 
        is_system: false, 
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 'col-4', 
        account_id: adminAccount.id, 
        name: 'Proposta', 
        position: 3, 
        color: '#06b6d4', 
        is_system: false, 
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 'col-5', 
        account_id: adminAccount.id, 
        name: 'Ganhos', 
        position: 4, 
        color: '#10b981', 
        is_system: false, 
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        id: 'col-6', 
        account_id: adminAccount.id, 
        name: 'Perdidos', 
        position: 5, 
        color: '#ef4444', 
        is_system: false, 
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    defaultColumns.forEach(col => this.columns.set(col.id, col));

    // Criar leads de exemplo
    const sampleLeads = [
      {
        id: 'lead-1',
        account_id: adminAccount.id,
        name: 'João Silva',
        phone: '11999999999',
        email: 'joao@example.com',
        platform: 'google',
        campaign: 'Orçamento Website',
        status: 'new',
        column_id: 'col-1',
        position: 1,
        value: 1500.00,
        notes: 'Interessado em desenvolvimento web',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'lead-2',
        account_id: adminAccount.id,
        name: 'Maria Souza',
        phone: '11888888888',
        email: 'maria@example.com',
        platform: 'facebook',
        campaign: 'Curso Online',
        status: 'new',
        column_id: 'col-1',
        position: 2,
        value: 800.00,
        notes: 'Quer curso de programação',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'lead-3',
        account_id: adminAccount.id,
        name: 'Empresa XYZ',
        phone: '1133334444',
        email: 'contato@empresaxyz.com',
        platform: 'linkedin',
        campaign: 'Consultoria',
        status: 'contacted',
        column_id: 'col-2',
        position: 1,
        value: 5000.00,
        notes: 'Grande empresa, muito potencial',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    sampleLeads.forEach(lead => this.leads.set(lead.id, lead));
  }

  // Account methods
  findAccount(criteria) {
    for (const account of this.accounts.values()) {
      if (criteria.email && account.email === criteria.email && criteria.is_active && account.is_active) {
        return account;
      }
      if (criteria.id && account.id === criteria.id) {
        return account;
      }
    }
    return null;
  }

  createAccount(data) {
    const id = data.id || this.generateId();
    const account = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.accounts.set(id, account);
    return account;
  }

  // Column methods
  findColumns(criteria) {
    return Array.from(this.columns.values())
      .filter(col => {
        if (criteria.account_id && col.account_id !== criteria.account_id) return false;
        if (criteria.is_active !== undefined && col.is_active !== criteria.is_active) return false;
        return true;
      })
      .sort((a, b) => a.position - b.position);
  }

  findColumn(criteria) {
    for (const column of this.columns.values()) {
      if (criteria.id && column.id === criteria.id) return column;
    }
    return null;
  }

  createColumn(data) {
    const id = data.id || this.generateId();
    const column = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.columns.set(id, column);
    return column;
  }

  updateColumn(id, data) {
    const column = this.columns.get(id);
    if (!column) return null;
    
    const updated = {
      ...column,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.columns.set(id, updated);
    return updated;
  }

  deleteColumn(id) {
    return this.columns.delete(id);
  }

  // Lead methods
  findLeads(criteria) {
    return Array.from(this.leads.values())
      .filter(lead => {
        if (criteria.account_id && lead.account_id !== criteria.account_id) return false;
        if (criteria.column_id && lead.column_id !== criteria.column_id) return false;
        if (criteria.status && lead.status !== criteria.status) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.column_id !== b.column_id) {
          const colA = this.columns.get(a.column_id);
          const colB = this.columns.get(b.column_id);
          return (colA?.position || 0) - (colB?.position || 0);
        }
        return a.position - b.position;
      });
  }

  findLead(criteria) {
    for (const lead of this.leads.values()) {
      if (criteria.id && lead.id === criteria.id) return lead;
    }
    return null;
  }

  createLead(data) {
    const id = data.id || this.generateId();
    const lead = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.leads.set(id, lead);
    return lead;
  }

  updateLead(id, data) {
    const lead = this.leads.get(id);
    if (!lead) return null;
    
    const updated = {
      ...lead,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.leads.set(id, updated);
    return updated;
  }

  deleteLead(id) {
    return this.leads.delete(id);
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new MemoryDatabase();