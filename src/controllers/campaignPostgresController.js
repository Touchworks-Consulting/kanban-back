const { Campaign, TriggerPhrase, Lead } = require('../models');
const { Op } = require('sequelize');

const campaignController = {
  // Listar campanhas
  listCampaigns: async (req, res) => {
    try {
      const accountId = req.account.id;
      const { platform, is_active, search } = req.query;

      const where = { account_id: accountId };
      
      if (platform) where.platform = platform;
      if (is_active !== undefined) where.is_active = is_active === 'true';
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { creative_code: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const campaigns = await Campaign.findAll({
        where,
        include: [
          {
            model: TriggerPhrase,
            as: 'triggerPhrases',
            where: { is_active: true },
            required: false
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Adicionar estatísticas para cada campanha
      const campaignsWithStats = await Promise.all(campaigns.map(async campaign => {
        const totalPhrases = await TriggerPhrase.count({
          where: { campaign_id: campaign.id }
        });

        const activePhrases = await TriggerPhrase.count({
          where: { campaign_id: campaign.id, is_active: true }
        });

        // Contar leads desta campanha
        const totalLeads = await Lead.count({
          where: { 
            account_id: accountId,
            campaign: campaign.name
          }
        });

        return {
          ...campaign.toJSON(),
          stats: {
            total_phrases: totalPhrases,
            active_phrases: activePhrases,
            total_leads: totalLeads
          }
        };
      }));

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

      const campaign = await Campaign.findOne({
        where: { id, account_id: accountId },
        include: [
          {
            model: TriggerPhrase,
            as: 'triggerPhrases',
            order: [['priority', 'ASC']]
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Buscar estatísticas de leads
      const leadStats = await Lead.findAll({
        where: { 
          account_id: accountId,
          campaign: campaign.name
        },
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const campaignWithStats = {
        ...campaign.toJSON(),
        lead_stats: leadStats
      };

      res.json({ campaign: campaignWithStats });
    } catch (error) {
      console.error('Error getting campaign:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Criar campanha
  createCampaign: async (req, res) => {
    try {
      const accountId = req.account.id;
      const { 
        name, 
        platform, 
        channel, 
        creative_code, 
        description, 
        budget,
        target_audience,
        campaign_settings,
        start_date,
        end_date
      } = req.body;

      // Validação básica
      if (!name || !platform || !channel) {
        return res.status(400).json({ 
          error: 'Nome, plataforma e canal são obrigatórios' 
        });
      }

      // Verificar se creative_code é único (se fornecido)
      if (creative_code) {
        const existingCampaign = await Campaign.findOne({
          where: { creative_code }
        });
        
        if (existingCampaign) {
          return res.status(409).json({ 
            error: 'Código criativo já existe' 
          });
        }
      }

      const campaign = await Campaign.create({
        account_id: accountId,
        name,
        platform,
        channel,
        creative_code,
        description,
        budget,
        target_audience: target_audience || {},
        campaign_settings: campaign_settings || {},
        start_date: start_date || null,
        end_date: end_date || null
      });

      res.status(201).json({ 
        message: 'Campanha criada com sucesso',
        campaign 
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors.map(e => e.message)
        });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atualizar campanha
  updateCampaign: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;
      const updateData = req.body;

      const campaign = await Campaign.findOne({
        where: { id, account_id: accountId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Verificar creative_code único se está sendo alterado
      if (updateData.creative_code && updateData.creative_code !== campaign.creative_code) {
        const existingCampaign = await Campaign.findOne({
          where: { 
            creative_code: updateData.creative_code,
            id: { [Op.ne]: id }
          }
        });
        
        if (existingCampaign) {
          return res.status(409).json({ 
            error: 'Código criativo já existe' 
          });
        }
      }

      await campaign.update(updateData);

      res.json({ 
        message: 'Campanha atualizada com sucesso',
        campaign 
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

      const campaign = await Campaign.findOne({
        where: { id, account_id: accountId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Verificar se há frases vinculadas
      const phraseCount = await TriggerPhrase.count({
        where: { campaign_id: id }
      });

      if (phraseCount > 0) {
        return res.status(400).json({ 
          error: 'Não é possível deletar campanha com frases vinculadas. Delete as frases primeiro.' 
        });
      }

      await campaign.destroy();

      res.json({ message: 'Campanha deletada com sucesso' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // FRASES GATILHO

  // Listar frases de uma campanha
  listTriggerPhrases: async (req, res) => {
    try {
      const { campaignId } = req.params;
      const accountId = req.account.id;

      // Verificar se a campanha pertence à conta
      const campaign = await Campaign.findOne({
        where: { id: campaignId, account_id: accountId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      const phrases = await TriggerPhrase.findAll({
        where: { campaign_id: campaignId },
        order: [['priority', 'ASC'], ['created_at', 'DESC']]
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
      const { 
        phrase, 
        keywords, 
        priority, 
        match_type, 
        case_sensitive, 
        min_confidence, 
        notes 
      } = req.body;

      // Verificar se a campanha pertence à conta
      const campaign = await Campaign.findOne({
        where: { id: campaignId, account_id: accountId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (!phrase || !keywords || keywords.length === 0) {
        return res.status(400).json({ 
          error: 'Frase e palavras-chave são obrigatórias' 
        });
      }

      const triggerPhrase = await TriggerPhrase.create({
        account_id: accountId,
        campaign_id: campaignId,
        phrase,
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        priority: priority || 1,
        match_type: match_type || 'keyword',
        case_sensitive: case_sensitive || false,
        min_confidence: min_confidence || 0.5,
        notes
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
      const { campaignId, phraseId } = req.params;
      const accountId = req.account.id;

      const triggerPhrase = await TriggerPhrase.findOne({
        where: { 
          id: phraseId, 
          campaign_id: campaignId, 
          account_id: accountId 
        }
      });

      if (!triggerPhrase) {
        return res.status(404).json({ error: 'Frase gatilho não encontrada' });
      }

      await triggerPhrase.update(req.body);

      res.json({ 
        message: 'Frase gatilho atualizada com sucesso',
        phrase: triggerPhrase 
      });
    } catch (error) {
      console.error('Error updating trigger phrase:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Deletar frase gatilho
  deleteTriggerPhrase: async (req, res) => {
    try {
      const { campaignId, phraseId } = req.params;
      const accountId = req.account.id;

      const triggerPhrase = await TriggerPhrase.findOne({
        where: { 
          id: phraseId, 
          campaign_id: campaignId, 
          account_id: accountId 
        }
      });

      if (!triggerPhrase) {
        return res.status(404).json({ error: 'Frase gatilho não encontrada' });
      }

      await triggerPhrase.destroy();

      res.json({ message: 'Frase gatilho deletada com sucesso' });
    } catch (error) {
      console.error('Error deleting trigger phrase:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Testar matching de uma frase
  testPhraseMatch: async (req, res) => {
    try {
      const { campaignId, phraseId } = req.params;
      const { message } = req.body;
      const accountId = req.account.id;

      if (!message) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
      }

      const triggerPhrase = await TriggerPhrase.findOne({
        where: { 
          id: phraseId, 
          campaign_id: campaignId, 
          account_id: accountId 
        },
        include: [{
          model: Campaign,
          as: 'campaign'
        }]
      });

      if (!triggerPhrase) {
        return res.status(404).json({ error: 'Frase gatilho não encontrada' });
      }

      const messageLower = message.toLowerCase();
      let match = null;

      // Test exact match
      if (messageLower.includes(triggerPhrase.phrase.toLowerCase())) {
        match = { 
          type: 'exact', 
          confidence: 1.0,
          matched_text: triggerPhrase.phrase
        };
      } else {
        // Test keyword match
        const keywords = triggerPhrase.keywords || [];
        const keywordMatches = keywords.filter(keyword => 
          messageLower.includes(keyword.toLowerCase())
        );

        if (keywordMatches.length > 0) {
          const confidence = keywordMatches.length / keywords.length;
          
          if (confidence >= triggerPhrase.min_confidence) {
            match = { 
              type: 'keyword', 
              confidence,
              matched_keywords: keywordMatches
            };
          }
        }
      }

      res.json({ 
        message: 'Teste realizado',
        input_message: message,
        phrase: triggerPhrase.phrase,
        keywords: triggerPhrase.keywords,
        match: match,
        would_trigger: match !== null
      });
    } catch (error) {
      console.error('Error testing phrase match:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = campaignController;