// Modelos para o sistema de campanhas em memória

class CampaignModels {
  constructor(memoryDb) {
    this.memoryDb = memoryDb;
    this.campaigns = new Map();
    this.triggerPhrases = new Map();
    this.whatsappAccounts = new Map();
    this.webhookLogs = new Map();
    
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Criar contas WhatsApp de exemplo
    const whatsappAccount1 = {
      id: 'wa-1',
      phone_id: '123456789',
      account_name: 'Empresa Principal',
      phone_number: '+5511999999999',
      is_active: true,
      account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3', // Admin account
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.whatsappAccounts.set(whatsappAccount1.id, whatsappAccount1);

    // Criar campanhas de exemplo
    const campaigns = [
      {
        id: 'camp-1',
        name: 'Vendas Online - Meta',
        platform: 'Meta',
        channel: 'Instagram',
        creative_code: 'CR001',
        description: 'Campanha de vendas para Instagram',
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'camp-2',
        name: 'Curso de Marketing - Google',
        platform: 'Google',
        channel: 'Google Ads',
        creative_code: 'CR002',
        description: 'Campanha de curso via Google Ads',
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'camp-3',
        name: 'Consultoria Empresarial - Meta',
        platform: 'Meta',
        channel: 'Facebook',
        creative_code: 'CR003',
        description: 'Campanha de consultoria para Facebook',
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    campaigns.forEach(campaign => this.campaigns.set(campaign.id, campaign));

    // Criar frases gatilho de exemplo
    const triggerPhrases = [
      {
        id: 'phrase-1',
        phrase: 'Vi seu anúncio sobre vendas',
        keywords: ['anuncio', 'vendas', 'anúncio'],
        campaign_id: 'camp-1',
        priority: 1,
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'phrase-2',
        phrase: 'Quero saber sobre o curso',
        keywords: ['curso', 'marketing', 'aprender'],
        campaign_id: 'camp-2',
        priority: 1,
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'phrase-3',
        phrase: 'Preciso de consultoria',
        keywords: ['consultoria', 'ajuda', 'empresa'],
        campaign_id: 'camp-3',
        priority: 1,
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'phrase-4',
        phrase: 'Olá, vim pelo Instagram',
        keywords: ['instagram', 'insta', 'story'],
        campaign_id: 'camp-1',
        priority: 2,
        is_active: true,
        account_id: '01905c91-0664-434d-83b6-cb372d3dc5b3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    triggerPhrases.forEach(phrase => this.triggerPhrases.set(phrase.id, phrase));
  }

  // Campaign methods
  findCampaigns(criteria) {
    return Array.from(this.campaigns.values())
      .filter(campaign => {
        if (criteria.account_id && campaign.account_id !== criteria.account_id) return false;
        if (criteria.is_active !== undefined && campaign.is_active !== criteria.is_active) return false;
        if (criteria.platform && campaign.platform !== criteria.platform) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  findCampaign(criteria) {
    for (const campaign of this.campaigns.values()) {
      if (criteria.id && campaign.id === criteria.id) return campaign;
      if (criteria.creative_code && campaign.creative_code === criteria.creative_code) return campaign;
    }
    return null;
  }

  createCampaign(data) {
    const id = data.id || this.generateId();
    const campaign = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  updateCampaign(id, data) {
    const campaign = this.campaigns.get(id);
    if (!campaign) return null;
    
    const updated = {
      ...campaign,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.campaigns.set(id, updated);
    return updated;
  }

  deleteCampaign(id) {
    return this.campaigns.delete(id);
  }

  // Trigger Phrase methods
  findTriggerPhrases(criteria) {
    return Array.from(this.triggerPhrases.values())
      .filter(phrase => {
        if (criteria.account_id && phrase.account_id !== criteria.account_id) return false;
        if (criteria.campaign_id && phrase.campaign_id !== criteria.campaign_id) return false;
        if (criteria.is_active !== undefined && phrase.is_active !== criteria.is_active) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  findTriggerPhrase(criteria) {
    for (const phrase of this.triggerPhrases.values()) {
      if (criteria.id && phrase.id === criteria.id) return phrase;
    }
    return null;
  }

  createTriggerPhrase(data) {
    const id = data.id || this.generateId();
    const phrase = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.triggerPhrases.set(id, phrase);
    return phrase;
  }

  updateTriggerPhrase(id, data) {
    const phrase = this.triggerPhrases.get(id);
    if (!phrase) return null;
    
    const updated = {
      ...phrase,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.triggerPhrases.set(id, updated);
    return updated;
  }

  deleteTriggerPhrase(id) {
    return this.triggerPhrases.delete(id);
  }

  // WhatsApp Account methods
  findWhatsappAccounts(criteria) {
    return Array.from(this.whatsappAccounts.values())
      .filter(account => {
        if (criteria.account_id && account.account_id !== criteria.account_id) return false;
        if (criteria.is_active !== undefined && account.is_active !== criteria.is_active) return false;
        return true;
      });
  }

  findWhatsappAccountByPhoneId(phone_id) {
    for (const account of this.whatsappAccounts.values()) {
      if (account.phone_id === phone_id) return account;
    }
    return null;
  }

  createWhatsappAccount(data) {
    const id = data.id || this.generateId();
    const account = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.whatsappAccounts.set(id, account);
    return account;
  }

  // Webhook Log methods
  createWebhookLog(data) {
    const id = data.id || this.generateId();
    const log = {
      id,
      ...data,
      created_at: new Date().toISOString()
    };
    this.webhookLogs.set(id, log);
    return log;
  }

  findWebhookLogs(criteria) {
    return Array.from(this.webhookLogs.values())
      .filter(log => {
        if (criteria.account_id && log.account_id !== criteria.account_id) return false;
        if (criteria.phone_id && log.phone_id !== criteria.phone_id) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, criteria.limit || 100);
  }

  // Phrase matching algorithm
  matchPhrase(message, accountId) {
    const phrases = this.findTriggerPhrases({ 
      account_id: accountId, 
      is_active: true 
    });

    const messageLower = message.toLowerCase();
    
    for (const phrase of phrases) {
      // Exact phrase match
      if (messageLower.includes(phrase.phrase.toLowerCase())) {
        return { phrase, confidence: 1.0, matchType: 'exact' };
      }

      // Keyword matching
      const keywordMatches = phrase.keywords.filter(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );

      if (keywordMatches.length > 0) {
        const confidence = keywordMatches.length / phrase.keywords.length;
        return { 
          phrase, 
          confidence, 
          matchType: 'keyword',
          matchedKeywords: keywordMatches
        };
      }
    }

    return null;
  }

  // Channel detection from source_url
  detectChannelFromUrl(source_url) {
    if (!source_url) return null;

    const url = source_url.toLowerCase();
    
    if (url.includes('instagram.com') || url.includes('ig.')) {
      return { platform: 'Meta', channel: 'Instagram' };
    }
    if (url.includes('facebook.com') || url.includes('fb.')) {
      return { platform: 'Meta', channel: 'Facebook' };
    }
    if (url.includes('google.com') || url.includes('googleads.')) {
      return { platform: 'Google', channel: 'Google Ads' };
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return { platform: 'Google', channel: 'YouTube' };
    }

    return null;
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = CampaignModels;