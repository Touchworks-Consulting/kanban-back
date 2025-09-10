const memoryDb = require('../database/memory-db');

const campaignController = {
  // Listar campanhas
  listCampaigns: async (req, res) => {
    try {
      const accountId = req.account.id;
      const { platform, is_active } = req.query;

      const campaigns = memoryDb.campaigns.findCampaigns({
        account_id: accountId,
        platform,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      });

      // Adicionar estatísticas para cada campanha
      const campaignsWithStats = campaigns.map(campaign => {
        const phrases = memoryDb.campaigns.findTriggerPhrases({
          campaign_id: campaign.id,
          is_active: true
        });

        // Contar leads desta campanha (simples busca por campanha no campo campaign)
        const leads = memoryDb.findLeads({ account_id: accountId })
          .filter(lead => lead.campaign === campaign.name);

        return {
          ...campaign,
          stats: {
            total_phrases: phrases.length,
            total_leads: leads.length,
            active_phrases: phrases.filter(p => p.is_active).length
          }
        };
      });

      res.json({ campaigns: campaignsWithStats });
    } catch (error) {
      console.error('Error listing campaigns:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Obter campanha por ID
  getCampaign: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;

      const campaign = memoryDb.campaigns.findCampaign({ id });

      if (!campaign || campaign.account_id !== accountId) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Buscar frases gatilho desta campanha
      const phrases = memoryDb.campaigns.findTriggerPhrases({
        campaign_id: id,
        account_id: accountId
      });

      res.json({ 
        campaign: {
          ...campaign,
          trigger_phrases: phrases
        }
      });
    } catch (error) {
      console.error('Error getting campaign:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Criar campanha
  createCampaign: async (req, res) => {
    try {
      const accountId = req.account.id;
      const { name, platform, channel, creative_code, description, trigger_phrases } = req.body;

      if (!name || !platform || !channel) {
        return res.status(400).json({
          error: 'Nome, plataforma e canal são obrigatórios'
        });
      }

      // Verificar se já existe campanha com mesmo nome
      const existingCampaigns = memoryDb.campaigns.findCampaigns({ account_id: accountId });
      if (existingCampaigns.some(c => c.name === name)) {
        return res.status(409).json({
          error: 'Já existe uma campanha com este nome'
        });
      }

      // Criar campanha
      const campaign = memoryDb.campaigns.createCampaign({
        name,
        platform,
        channel,
        creative_code: creative_code || `CR${Date.now()}`,
        description: description || '',
        is_active: true,
        account_id: accountId
      });

      // Criar frases gatilho se fornecidas
      if (trigger_phrases && Array.isArray(trigger_phrases)) {
        for (const phraseData of trigger_phrases) {
          if (phraseData.phrase) {
            memoryDb.campaigns.createTriggerPhrase({
              phrase: phraseData.phrase,
              keywords: phraseData.keywords || [],
              campaign_id: campaign.id,
              priority: phraseData.priority || 1,
              is_active: true,
              account_id: accountId
            });
          }
        }
      }

      res.status(201).json({
        message: 'Campanha criada com sucesso',
        campaign
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atualizar campanha
  updateCampaign: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;
      const updateData = { ...req.body };
      delete updateData.account_id; // Não permitir alterar account_id

      const campaign = memoryDb.campaigns.findCampaign({ id });

      if (!campaign || campaign.account_id !== accountId) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      const updatedCampaign = memoryDb.campaigns.updateCampaign(id, updateData);

      res.json({
        message: 'Campanha atualizada com sucesso',
        campaign: updatedCampaign
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Deletar campanha
  deleteCampaign: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;

      const campaign = memoryDb.campaigns.findCampaign({ id });

      if (!campaign || campaign.account_id !== accountId) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Verificar se há frases gatilho associadas
      const phrases = memoryDb.campaigns.findTriggerPhrases({ campaign_id: id });
      if (phrases.length > 0) {
        return res.status(400).json({
          error: `Não é possível deletar a campanha. Há ${phrases.length} frase(s) gatilho associada(s).`,
          details: 'Remova as frases gatilho antes de deletar a campanha.'
        });
      }

      memoryDb.campaigns.deleteCampaign(id);

      res.json({ message: 'Campanha deletada com sucesso' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Listar frases gatilho de uma campanha
  listTriggerPhrases: async (req, res) => {
    try {
      const { campaignId } = req.params;
      const accountId = req.account.id;

      // Verificar se a campanha existe e pertence à conta
      const campaign = memoryDb.campaigns.findCampaign({ id: campaignId });
      if (!campaign || campaign.account_id !== accountId) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      const phrases = memoryDb.campaigns.findTriggerPhrases({
        campaign_id: campaignId,
        account_id: accountId
      });

      res.json({ phrases });
    } catch (error) {
      console.error('Error listing trigger phrases:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Criar frase gatilho
  createTriggerPhrase: async (req, res) => {
    try {
      const { campaignId } = req.params;
      const accountId = req.account.id;
      const { phrase, keywords, priority } = req.body;

      if (!phrase) {
        return res.status(400).json({ error: 'Frase é obrigatória' });
      }

      // Verificar se a campanha existe e pertence à conta
      const campaign = memoryDb.campaigns.findCampaign({ id: campaignId });
      if (!campaign || campaign.account_id !== accountId) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      const triggerPhrase = memoryDb.campaigns.createTriggerPhrase({
        phrase,
        keywords: keywords || [],
        campaign_id: campaignId,
        priority: priority || 1,
        is_active: true,
        account_id: accountId
      });

      res.status(201).json({
        message: 'Frase gatilho criada com sucesso',
        phrase: triggerPhrase
      });
    } catch (error) {
      console.error('Error creating trigger phrase:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atualizar frase gatilho
  updateTriggerPhrase: async (req, res) => {
    try {
      const { phraseId } = req.params;
      const accountId = req.account.id;
      const updateData = { ...req.body };
      delete updateData.account_id;

      const phrase = memoryDb.campaigns.findTriggerPhrase({ id: phraseId });

      if (!phrase || phrase.account_id !== accountId) {
        return res.status(404).json({ error: 'Frase gatilho não encontrada' });
      }

      const updatedPhrase = memoryDb.campaigns.updateTriggerPhrase(phraseId, updateData);

      res.json({
        message: 'Frase gatilho atualizada com sucesso',
        phrase: updatedPhrase
      });
    } catch (error) {
      console.error('Error updating trigger phrase:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Deletar frase gatilho
  deleteTriggerPhrase: async (req, res) => {
    try {
      const { phraseId } = req.params;
      const accountId = req.account.id;

      const phrase = memoryDb.campaigns.findTriggerPhrase({ id: phraseId });

      if (!phrase || phrase.account_id !== accountId) {
        return res.status(404).json({ error: 'Frase gatilho não encontrada' });
      }

      memoryDb.campaigns.deleteTriggerPhrase(phraseId);

      res.json({ message: 'Frase gatilho deletada com sucesso' });
    } catch (error) {
      console.error('Error deleting trigger phrase:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Testar correspondência de frase
  testPhraseMatch: async (req, res) => {
    try {
      const accountId = req.account.id;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
      }

      const match = memoryDb.campaigns.matchPhrase(message, accountId);

      if (match) {
        const campaign = memoryDb.campaigns.findCampaign({ id: match.phrase.campaign_id });
        
        res.json({
          match_found: true,
          phrase: match.phrase,
          campaign,
          confidence: match.confidence,
          match_type: match.matchType,
          matched_keywords: match.matchedKeywords
        });
      } else {
        res.json({
          match_found: false,
          message: 'Nenhuma frase gatilho encontrada para esta mensagem'
        });
      }
    } catch (error) {
      console.error('Error testing phrase match:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = campaignController;