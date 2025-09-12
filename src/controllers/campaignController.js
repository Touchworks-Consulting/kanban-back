const { Campaign, TriggerPhrase, Lead } = require('../models');
const { Op } = require('sequelize');
const { processSequelizeResponse } = require('../utils/dateSerializer');

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
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const campaigns = await Campaign.findAll({
        where,
        include: [
          {
            model: TriggerPhrase,
            as: 'triggerPhrases',
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

      res.json({ campaigns: processSequelizeResponse(campaignsWithStats) });
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

      // Calculate stats
      const totalPhrases = campaign.triggerPhrases ? campaign.triggerPhrases.length : 0;
      const activePhrases = campaign.triggerPhrases ? campaign.triggerPhrases.filter(p => p.is_active).length : 0;
      const totalLeads = leadStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);

      const campaignWithStats = {
        ...campaign.toJSON(),
        lead_stats: leadStats,
        stats: {
          total_phrases: totalPhrases,
          active_phrases: activePhrases,
          total_leads: totalLeads
        }
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
        description, 
        budget,
        target_audience,
        campaign_settings,
        start_date,
        end_date,
        trigger_phrases
      } = req.body;

      console.log('📊 Creating campaign with data:', {
        name,
        platform,
        channel,
        trigger_phrases: trigger_phrases ? trigger_phrases.length : 0,
        trigger_phrases_data: trigger_phrases
      });

      // Validação básica
      if (!name || !platform || !channel) {
        return res.status(400).json({ 
          error: 'Nome, plataforma e canal são obrigatórios' 
        });
      }

      // Usar transação para garantir que campanha e frases sejam criadas juntas
      const { sequelize } = require('../database/connection');
      const result = await sequelize.transaction(async (t) => {
        // Criar a campanha
        const campaign = await Campaign.create({
          account_id: accountId,
          name,
          platform,
          channel,
          description,
          budget,
          target_audience: target_audience || {},
          campaign_settings: campaign_settings || {},
          start_date: start_date || null,
          end_date: end_date || null
        }, { transaction: t });

        console.log('✅ Campaign created:', campaign.id);

        // Criar as frases gatilho se fornecidas
        if (trigger_phrases && trigger_phrases.length > 0) {
          const triggerPhrasesData = trigger_phrases.map((phrase, index) => ({
            account_id: accountId,
            campaign_id: campaign.id,
            phrase: phrase.phrase,
            creative_code: phrase.creative_code || null,
            priority: phrase.priority || (index + 1),
            match_type: 'contains', // valor padrão
            is_active: true
          }));

          console.log('📝 Creating trigger phrases:', triggerPhrasesData);
          const createdPhrases = await TriggerPhrase.bulkCreate(triggerPhrasesData, { transaction: t });
          console.log('✅ Trigger phrases created:', createdPhrases.length);
        } else {
          console.log('⚠️ No trigger phrases provided');
        }

        // Buscar a campanha com as frases criadas
        const campaignWithPhrases = await Campaign.findByPk(campaign.id, {
          include: [
            {
              model: TriggerPhrase,
              as: 'triggerPhrases',
              order: [['priority', 'ASC']]
            }
          ],
          transaction: t
        });

        return campaignWithPhrases;
      });

      // Buscar estatísticas de leads para a nova campanha
      const leadStats = await Lead.findAll({
        where: { 
          account_id: accountId,
          campaign: result.name
        },
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Calculate stats (same as getCampaign)
      const totalPhrases = result.triggerPhrases ? result.triggerPhrases.length : 0;
      const activePhrases = result.triggerPhrases ? result.triggerPhrases.filter(p => p.is_active).length : 0;
      const totalLeads = leadStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);

      const campaignWithStats = {
        ...result.toJSON(),
        lead_stats: leadStats,
        stats: {
          total_phrases: totalPhrases,
          active_phrases: activePhrases,
          total_leads: totalLeads
        }
      };

      console.log('🎉 Campaign creation completed with stats:', { 
        phrases: campaignWithStats.stats.total_phrases,
        leads: campaignWithStats.stats.total_leads 
      });

      res.status(201).json({ 
        message: 'Campanha criada com sucesso',
        campaign: campaignWithStats 
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
        creative_code,
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

      if (!phrase) {
        return res.status(400).json({ 
          error: 'Frase é obrigatória' 
        });
      }

      const triggerPhrase = await TriggerPhrase.create({
        account_id: accountId,
        campaign_id: campaignId,
        phrase,
        creative_code,
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
        // Test phrase contains match
        if (messageLower.includes(triggerPhrase.phrase.toLowerCase())) {
          match = { 
            type: 'contains', 
            confidence: 0.8
          };
        }
      }

      res.json({ 
        message: 'Teste realizado',
        input_message: message,
        phrase: triggerPhrase.phrase,
        creative_code: triggerPhrase.creative_code,
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