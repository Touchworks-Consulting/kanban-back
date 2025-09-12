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
  },

  // 📊 RELATÓRIO DE FRASES MAIS EFICAZES
  getMostEffectivePhrases: async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { date_range = '30' } = req.query; // dias
      const accountId = req.account.id;

      // Verificar se a campanha pertence à conta
      const campaign = await Campaign.findOne({
        where: { id: campaignId, account_id: accountId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Data de início baseada no range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(date_range));

      // Buscar todos os leads da campanha no período
      const leads = await Lead.findAll({
        where: {
          account_id: accountId,
          campaign: campaign.name,
          created_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        attributes: ['metadata', 'created_at', 'message', 'name', 'phone'],
        raw: true
      });

      console.log(`🔍 DEBUG - Campaign: ${campaign.name}`);
      console.log(`🔍 DEBUG - Found ${leads.length} leads in last ${date_range} days`);

      // Agrupar e contar frases eficazes
      const phraseStats = {};
      let totalLeads = 0;
      const leadsDebug = [];

      leads.forEach(lead => {
        totalLeads++;
        const metadata = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : lead.metadata;
        
        // 🎯 PRIORIZAR: referral.body > mensagem do lead
        let effectivePhrase = metadata?.effective_phrase;
        let phraseCode = null;
        
        if (!effectivePhrase && lead.message) {
          effectivePhrase = lead.message; // Usar mensagem se não há referral
        }
        
        // Tentar capturar código da frase gatilho se houve match
        if (metadata?.campaign_match?.phrase) {
          phraseCode = metadata.campaign_match.phrase;
        }
        
        const originalMessage = lead.message;
        
        // Debug info
        leadsDebug.push({
          name: lead.name,
          phone: lead.phone,
          message: originalMessage,
          effective_phrase: effectivePhrase,
          phrase_code: phraseCode,
          has_referral: !!metadata?.referral_data,
          campaign_match: metadata?.campaign_match
        });
        
        if (effectivePhrase) {
          // Truncar frase muito longa para exibição
          const displayPhrase = effectivePhrase.length > 100 
            ? effectivePhrase.substring(0, 100) + '...'
            : effectivePhrase;
          
          if (!phraseStats[displayPhrase]) {
            phraseStats[displayPhrase] = {
              phrase: displayPhrase,
              original_phrase: effectivePhrase,
              phrase_code: phraseCode || 'N/A',
              volume: 0,
              percentage: 0
            };
          }
          phraseStats[displayPhrase].volume++;
          
          // Atualizar código se disponível
          if (phraseCode) {
            phraseStats[displayPhrase].phrase_code = phraseCode;
          }
        }
      });

      console.log('🔍 DEBUG - Leads details:', JSON.stringify(leadsDebug, null, 2));

      // Calcular percentuais e ordenar por volume
      const sortedPhrases = Object.values(phraseStats)
        .map(phrase => ({
          ...phrase,
          percentage: totalLeads > 0 ? ((phrase.volume / totalLeads) * 100).toFixed(1) : '0.0'
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10); // Top 10 frases

      res.json({
        campaign_name: campaign.name,
        date_range: `${date_range} dias`,
        total_leads: totalLeads,
        effective_phrases: sortedPhrases,
        debug: {
          leads_details: leadsDebug
        }
      });
    } catch (error) {
      console.error('Error getting most effective phrases:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // 🔍 DEBUG RELATÓRIOS DA CAMPANHA
  debugCampaignReports: async (req, res) => {
    try {
      const { campaignId } = req.params;
      const accountId = req.account.id;

      // Buscar a campanha
      const campaign = await Campaign.findOne({
        where: { id: campaignId, account_id: accountId },
        include: [{
          model: TriggerPhrase,
          as: 'triggerPhrases'
        }]
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Buscar todos os leads da campanha
      const leads = await Lead.findAll({
        where: {
          account_id: accountId,
          campaign: campaign.name
        },
        attributes: ['id', 'name', 'phone', 'message', 'metadata', 'created_at'],
        order: [['created_at', 'DESC']],
        raw: true
      });

      // Processar dados dos leads
      const leadsWithDetails = leads.map(lead => {
        const metadata = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : lead.metadata;
        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          message: lead.message,
          created_at: lead.created_at,
          effective_phrase: metadata?.effective_phrase,
          has_referral: !!metadata?.referral_data,
          referral_headline: metadata?.referral_data?.headline,
          referral_source_type: metadata?.referral_data?.source_type,
          campaign_match: metadata?.campaign_match,
          whatsapp_phone_id: metadata?.whatsapp_phone_id
        };
      });

      // 📊 CALCULAR MÉTRICAS COMPARATIVAS
      // Total de leads de campanhas identificadas apenas (excluir "Não identificada")
      const totalLeadsAllCampaigns = await Lead.count({
        where: { 
          account_id: accountId,
          campaign: { [require('sequelize').Op.ne]: 'Não identificada' }
        }
      });

      console.log(`🔍 CONVERSÃO DEBUG - Campanha: ${campaign.name}`);
      console.log(`📊 Leads desta campanha: ${leads.length}`);
      console.log(`📊 Total leads campanhas identificadas: ${totalLeadsAllCampaigns}`);

      // Taxa de conversão comparativa (% desta campanha vs campanhas identificadas)
      const comparativeConversionRate = totalLeadsAllCampaigns > 0 
        ? ((leads.length / totalLeadsAllCampaigns) * 100).toFixed(1)
        : '0.0';

      console.log(`📊 Taxa calculada: ${comparativeConversionRate}%`);
      console.log(`📊 Fórmula: (${leads.length} / ${totalLeadsAllCampaigns}) * 100 = ${comparativeConversionRate}%`);

      // Ticket médio (se houver campo value nos leads)
      const avgTicket = await Lead.findOne({
        where: {
          account_id: accountId,
          campaign: campaign.name,
          value: { [require('sequelize').Op.not]: null }
        },
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('value')), 'avg_value'],
          [require('sequelize').fn('SUM', require('sequelize').col('value')), 'total_value']
        ],
        raw: true
      });

      // Leads nos últimos 30 dias para calcular crescimento
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentLeads = await Lead.count({
        where: {
          account_id: accountId,
          campaign: campaign.name,
          created_at: { [require('sequelize').Op.gte]: thirtyDaysAgo }
        }
      });

      // 📈 CÁLCULO DO CRESCIMENTO VS PERÍODO ANTERIOR
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const previousPeriodLeads = await Lead.count({
        where: {
          account_id: accountId,
          campaign: campaign.name,
          created_at: { 
            [require('sequelize').Op.between]: [sixtyDaysAgo, thirtyDaysAgo] 
          }
        }
      });

      // Cálculo da taxa de crescimento
      let growthRate = 0;
      if (previousPeriodLeads > 0) {
        growthRate = ((recentLeads - previousPeriodLeads) / previousPeriodLeads) * 100;
      } else if (recentLeads > 0) {
        growthRate = 100; // Se não havia leads no período anterior mas há agora
      }

      console.log(`📈 CRESCIMENTO DEBUG: Atual: ${recentLeads}, Anterior: ${previousPeriodLeads}, Taxa: ${growthRate.toFixed(1)}%`);

      // Simular cálculo de mensagens - SUBSTITUIR por métrica mais valiosa
      // Sugestão: Total de interações, tempo médio de resposta, ou custo por lead
      const totalInteractions = leads.length * 2.5; // Mock: cada lead = ~2.5 interações
      const avgResponseTime = Math.floor(Math.random() * 120) + 30; // Mock: 30-150 minutos

      // Taxa de conversão real baseada nos dados
      const conversionRate = comparativeConversionRate;

      res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          channel: campaign.channel,
          is_active: campaign.is_active
        },
        metrics: {
          total_leads: leads.length,
          total_interactions: Math.round(totalInteractions), // NOVA MÉTRICA: Total de interações
          avg_response_time: avgResponseTime, // NOVA MÉTRICA: Tempo médio de resposta (mock)
          comparative_conversion_rate: conversionRate, // NOVA: Taxa comparativa vs todas campanhas
          growth_rate: parseFloat(growthRate.toFixed(1)), // NOVA: Crescimento vs período anterior
          total_leads_all_campaigns: totalLeadsAllCampaigns, // Para contexto
          total_phrases: campaign.triggerPhrases ? campaign.triggerPhrases.length : 0,
          active_phrases: campaign.triggerPhrases ? campaign.triggerPhrases.filter(p => p.is_active).length : 0,
          avg_ticket: avgTicket?.avg_value ? parseFloat(avgTicket.avg_value).toFixed(2) : '0.00',
          total_revenue: avgTicket?.total_value ? parseFloat(avgTicket.total_value).toFixed(2) : '0.00',
          recent_leads_30d: recentLeads
        },
        leads_details: leadsWithDetails,
        issues_found: {
          leads_without_effective_phrase: leadsWithDetails.filter(l => !l.effective_phrase).length,
          leads_without_referral: leadsWithDetails.filter(l => !l.has_referral).length,
          total_issues: leadsWithDetails.filter(l => !l.effective_phrase && !l.has_referral).length
        }
      });
    } catch (error) {
      console.error('Error debugging campaign reports:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // 📊 DADOS DOS GRÁFICOS DE RELATÓRIO
  getCampaignChartData: async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { date_range = '30' } = req.query; // dias
      const accountId = req.account.id;

      // Verificar se a campanha pertence à conta
      const campaign = await Campaign.findOne({
        where: { id: campaignId, account_id: accountId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Data de início baseada no range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(date_range));

      // 📈 LEADS POR DIA - Dados reais
      const dailyLeads = await Lead.findAll({
        where: {
          account_id: accountId,
          campaign: campaign.name,
          created_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        attributes: [
          [require('sequelize').literal('DATE("created_at")'), 'date'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'leads']
        ],
        group: [require('sequelize').literal('DATE("created_at")')],
        order: [[require('sequelize').literal('DATE("created_at")'), 'ASC']],
        raw: true
      });

      // Preencher dias sem leads com 0
      const dailyData = [];
      for (let i = parseInt(date_range) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const existingData = dailyLeads.find(d => d.date === dateStr);
        dailyData.push({
          date: dateStr,
          leads: existingData ? parseInt(existingData.leads) : 0,
          day: date.getDate().toString()
        });
      }

      // 🕐 LEADS POR HORA - Dados reais
      const hourlyLeads = await Lead.findAll({
        where: {
          account_id: accountId,
          campaign: campaign.name,
          created_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        attributes: [
          [require('sequelize').literal('EXTRACT(HOUR FROM "created_at")'), 'hour'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'leads']
        ],
        group: [require('sequelize').literal('EXTRACT(HOUR FROM "created_at")')],
        order: [[require('sequelize').literal('EXTRACT(HOUR FROM "created_at")'), 'ASC']],
        raw: true
      });

      // Preencher todas as 24 horas
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const existingData = hourlyLeads.find(d => parseInt(d.hour) === hour);
        hourlyData.push({
          hour: hour.toString().padStart(2, '0') + 'h',
          leads: existingData ? parseInt(existingData.leads) : 0,
          hourNumber: hour
        });
      }

      res.json({
        campaign_name: campaign.name,
        date_range: `${date_range} dias`,
        daily_data: dailyData,
        hourly_data: hourlyData,
        total_leads: dailyData.reduce((sum, day) => sum + day.leads, 0),
        peak_hour: hourlyData.reduce((prev, current) => prev.leads > current.leads ? prev : current)
      });
    } catch (error) {
      console.error('Error getting campaign chart data:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // 🔍 DEBUG: TODAS AS CAMPANHAS E LEADS
  debugAllCampaignsLeads: async (req, res) => {
    try {
      const accountId = req.account.id;
      
      // Buscar todas as campanhas
      const campaigns = await Campaign.findAll({
        where: { account_id: accountId }
      });

      // Buscar leads agrupados por campanha
      const leadsPerCampaign = await Lead.findAll({
        where: { account_id: accountId },
        attributes: [
          'campaign',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'lead_count']
        ],
        group: ['campaign'],
        raw: true
      });

      // Total de leads
      const totalLeads = await Lead.count({
        where: { account_id: accountId }
      });

      console.log('🔍 DEBUG ALL CAMPAIGNS:');
      console.log('📊 Campanhas registradas:', campaigns.map(c => ({ name: c.name, id: c.id })));
      console.log('📊 Leads por campanha:', leadsPerCampaign);
      console.log('📊 Total de leads:', totalLeads);

      res.json({
        campaigns: campaigns.map(c => ({ id: c.id, name: c.name, is_active: c.is_active })),
        leads_per_campaign: leadsPerCampaign,
        total_leads: totalLeads
      });
    } catch (error) {
      console.error('Error debugging all campaigns leads:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = campaignController;