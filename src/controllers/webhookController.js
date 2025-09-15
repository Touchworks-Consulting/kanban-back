const { 
  WhatsAppAccount, 
  Campaign, 
  TriggerPhrase, 
  Lead, 
  KanbanColumn, 
  WebhookLog 
} = require('../models');

const webhookController = {
  whatsappWebhook: async (req, res) => {
    try {
      let webhookData = req.body;
      console.log('🔴 WhatsApp Webhook PostgreSQL received:', JSON.stringify(webhookData, null, 2));
      
      let entries = [];
      
      // Check if webhook data is an array of entries
      if (Array.isArray(webhookData)) {
        entries = webhookData;
      }
      // Check if it's the full Meta format with entry array
      else if (webhookData.entry && Array.isArray(webhookData.entry)) {
        entries = webhookData.entry;
      } 
      // Check if it's a single entry format
      else if (webhookData.changes && Array.isArray(webhookData.changes)) {
        entries = [webhookData]; // Wrap single entry in array
      } 
      else {
        console.log('Invalid webhook structure - no entry or changes found');
        return res.status(400).json({ error: 'Estrutura inválida' });
      }

      let processedMessages = 0;
      let leadsCreated = 0;

      for (const entry of entries) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;
          if (!change.value || !change.value.messages) continue;

          const { metadata, messages, contacts } = change.value;
          const phone_id = metadata?.phone_number_id;
          
          console.log(`🔍 Processing messages for phone_id: ${phone_id}`);
          
          if (!phone_id) {
            console.log('No phone_id found in metadata');
            continue;
          }

          // Find WhatsApp account by phone_id usando PostgreSQL
          const whatsappAccount = await WhatsAppAccount.findOne({
            where: { phone_id, is_active: true },
            include: [{ model: require('../models').Account, as: 'account' }]
          });

          if (!whatsappAccount) {
            console.log(`❌ No WhatsApp account found for phone_id: ${phone_id}`);
            
            // Log unprocessed webhook no PostgreSQL
            await WebhookLog.create({
              phone_id: phone_id,
              account_id: null,
              event_type: 'message',
              payload: webhookData,
              processed: false,
              campaign_matched: null,
              lead_created: false,
              error: 'Conta WhatsApp não encontrada'
            });
            continue;
          }

          console.log(`✅ Found WhatsApp account: ${whatsappAccount.account_name}`);

          for (const message of messages) {
            const result = await processWhatsAppMessagePostgres(
              message, 
              contacts, 
              whatsappAccount
            );
            processedMessages++;
            if (result.leadCreated) leadsCreated++;
            
            // Log processed webhook no PostgreSQL
            await WebhookLog.create({
              phone_id: phone_id,
              account_id: whatsappAccount.account_id,
              event_type: 'message',
              payload: {
                message: message,
                contacts: contacts,
                metadata: metadata
              },
              processed: true,
              campaign_matched: result.campaign?.name || null,
              lead_created: result.leadCreated,
              error: result.error || null
            });
          }
        }
      }

      console.log(`🎉 Webhook processed: ${processedMessages} messages, ${leadsCreated} leads created`);

      res.status(200).json({ 
        success: true,
        processed_messages: processedMessages,
        leads_created: leadsCreated
      });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  },

  verifyWebhook: (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'webhook_verify_token_123';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Token inválido' });
    }
  }
};

async function processWhatsAppMessagePostgres(message, contacts, whatsappAccount) {
  try {
    let messageText = '';
    let effectivePhrase = null;
    
    // Extract message text based on message type
    if (message.type === 'text' && message.text?.body) {
      messageText = message.text.body;
    } else if (message.type === 'interactive') {
      if (message.interactive?.list_reply) {
        messageText = message.interactive.list_reply.title || message.interactive.list_reply.description || '';
      } else if (message.interactive?.button_reply) {
        messageText = message.interactive.button_reply.title || '';
      }
    } else {
      return { leadCreated: false, error: `Tipo de mensagem não suportado: ${message.type}` };
    }
    
    // 🎯 CAPTURAR FRASE EFICAZ - Priorizar referral.body sobre text.body
    if (message.referral?.body) {
      effectivePhrase = message.referral.body;
      console.log(`📈 Effective phrase from referral: "${effectivePhrase.substring(0, 100)}..."`);
    } else if (messageText) {
      effectivePhrase = messageText;
      console.log(`📈 Effective phrase from message text: "${effectivePhrase}"`);
    }
    
    if (!messageText.trim()) {
      return { leadCreated: false, error: 'Mensagem vazia' };
    }
    
    const fromNumber = message.from;
    console.log(`📱 Processing text message from ${fromNumber}: "${messageText}"`);
    
    const contact = contacts?.find(c => c.wa_id === fromNumber);
    const contactName = contact?.profile?.name || `Lead ${fromNumber.slice(-4)}`;

    // 🔍 ALGORITMO DE MATCHING POSTGRESQL
    const match = await matchPhrasePostgres(messageText, whatsappAccount.account_id);
    let campaign = null;

    if (match) {
      console.log(`🎯 Message matched campaign: ${match.campaign.name} with phrase: "${match.triggerPhrase.phrase}"`);
      campaign = match.campaign;
    } else {
      console.log('❌ No campaign match found for message');
    }

    // Check if lead already exists
    const existingLead = await Lead.findOne({
      where: { 
        account_id: whatsappAccount.account_id,
        phone: fromNumber 
      }
    });

    if (existingLead) {
      console.log(`🔄 Lead already exists: ${existingLead.name}`);
      // Update message if new one is longer
      if (!existingLead.message || existingLead.message.length < messageText.length) {
        await existingLead.update({ message: messageText });
        console.log('✅ Updated existing lead message');
      }
      return { leadCreated: false, campaign, error: null };
    }

    // Find default column for new leads (system column first)
    const defaultColumn = await KanbanColumn.findOne({
      where: {
        account_id: whatsappAccount.account_id,
        is_active: true
      },
      order: [
        ['is_system', 'DESC'], // System columns first
        ['position', 'ASC']     // Then by position
      ]
    });

    if (!defaultColumn) {
      console.log('❌ No default column found - no active columns exist');
      return { leadCreated: false, campaign, error: 'Nenhuma coluna ativa encontrada' };
    }

    // Calculate position
    const leadsInColumn = await Lead.count({
      where: {
        account_id: whatsappAccount.account_id,
        column_id: defaultColumn.id
      }
    });

    // Create new lead no PostgreSQL
    const leadData = {
      name: contactName,
      phone: fromNumber,
      message: messageText,
      platform: campaign?.platform || 'WhatsApp',
      campaign: campaign?.name || 'Não identificada',
      status: 'new',
      column_id: defaultColumn.id,
      position: leadsInColumn,
      account_id: whatsappAccount.account_id,
      metadata: {
        whatsapp_phone_id: whatsappAccount.phone_id,
        whatsapp_account_name: whatsappAccount.account_name,
        effective_phrase: effectivePhrase, // 🎯 FRASE EFICAZ CAPTURADA
        referral_data: message.referral || null, // 🎯 DADOS COMPLETOS DO REFERRAL
        campaign_match: match ? {
          phrase: match.triggerPhrase.phrase,
          confidence: match.confidence,
          match_type: match.matchType,
          campaign_id: match.campaign.id,
          trigger_phrase_id: match.triggerPhrase.id
        } : null,
        original_message: messageText,
        contact_info: contact || null
      }
    };

    const newLead = await Lead.create(leadData);

    // Update trigger phrase statistics
    if (match) {
      await TriggerPhrase.update(
        { 
          total_matches: match.triggerPhrase.total_matches + 1,
          last_matched_at: new Date()
        },
        { where: { id: match.triggerPhrase.id } }
      );

      // Update campaign statistics
      await Campaign.increment('total_leads', { 
        by: 1, 
        where: { id: match.campaign.id } 
      });
    }

    console.log(`🎉 New lead created: ${contactName} (${fromNumber}) -> ${campaign?.name || 'No campaign'}`);

    return { 
      leadCreated: true, 
      campaign, 
      error: null,
      lead: newLead 
    };

  } catch (error) {
    console.error('❌ Error processing message:', error);
    return { 
      leadCreated: false, 
      campaign: null, 
      error: error.message 
    };
  }
}

// 🔍 ALGORITMO DE MATCHING POSTGRESQL
async function matchPhrasePostgres(message, accountId) {
  try {
    const messageLower = message.toLowerCase();

    // Buscar frases ativas por prioridade
    const triggerPhrases = await TriggerPhrase.findAll({
      where: { 
        account_id: accountId, 
        is_active: true 
      },
      include: [{
        model: Campaign,
        as: 'campaign',
        where: { is_active: true }
      }],
      order: [['priority', 'ASC']] // Prioridade 1 = primeira
    });

    for (const triggerPhrase of triggerPhrases) {
      // 1. EXACT MATCH
      if (messageLower.includes(triggerPhrase.phrase.toLowerCase())) {
        console.log(`🎯 EXACT match: "${triggerPhrase.phrase}"`);
        return { 
          triggerPhrase, 
          campaign: triggerPhrase.campaign,
          confidence: 1.0, 
          matchType: 'exact' 
        };
      }

      // 2. KEYWORD MATCH
      const keywords = triggerPhrase.keywords || [];
      const keywordMatches = keywords.filter(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );

      if (keywordMatches.length > 0) {
        const confidence = keywordMatches.length / keywords.length;
        
        // Check minimum confidence
        if (confidence >= triggerPhrase.min_confidence) {
          console.log(`🎯 KEYWORD match: ${keywordMatches.join(', ')} (${confidence.toFixed(2)})`);
          return { 
            triggerPhrase,
            campaign: triggerPhrase.campaign,
            confidence, 
            matchType: 'keyword',
            matchedKeywords: keywordMatches
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error in phrase matching:', error);
    return null;
  }
}

module.exports = webhookController;