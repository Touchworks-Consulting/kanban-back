const memoryDb = require('../database/memory-db');

const webhookController = {
  whatsappWebhook: async (req, res) => {
    try {
      const webhookData = req.body;
      
      const logEntry = memoryDb.campaigns.createWebhookLog({
        webhook_type: 'whatsapp',
        raw_data: webhookData,
        processed: false
      });

      console.log('WhatsApp Webhook received');

      if (!webhookData.entry || !Array.isArray(webhookData.entry)) {
        return res.status(400).json({ error: 'Estrutura inválida' });
      }

      for (const entry of webhookData.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;
          if (!change.value || !change.value.messages) continue;

          const { metadata, messages, contacts } = change.value;
          const phone_id = metadata?.phone_number_id;
          
          if (!phone_id) continue;

          const whatsappAccount = memoryDb.campaigns.findWhatsappAccountByPhoneId(phone_id);
          if (!whatsappAccount) continue;

          for (const message of messages) {
            await processWhatsAppMessage(message, contacts, whatsappAccount, logEntry.id);
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
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

async function processWhatsAppMessage(message, contacts, whatsappAccount, logId) {
  try {
    if (message.type !== 'text' || !message.text?.body) return;

    const messageText = message.text.body;
    const fromNumber = message.from;
    
    const contact = contacts?.find(c => c.wa_id === fromNumber);
    const contactName = contact?.profile?.name || `Lead ${fromNumber.slice(-4)}`;

    const match = memoryDb.campaigns.matchPhrase(messageText, whatsappAccount.account_id);
    let campaign = null;

    if (match) {
      campaign = memoryDb.campaigns.findCampaign({ id: match.phrase.campaign_id });
    }

    const existingLead = memoryDb.findLeads({ account_id: whatsappAccount.account_id })
      .find(lead => lead.phone === fromNumber);

    if (existingLead) {
      if (!existingLead.message || existingLead.message.length < messageText.length) {
        memoryDb.updateLead(existingLead.id, { message: messageText });
      }
      return;
    }

    const defaultColumn = memoryDb.findColumns({
      account_id: whatsappAccount.account_id,
      is_active: true
    }).find(col => col.is_system);

    if (!defaultColumn) return;

    const leadsInColumn = memoryDb.findLeads({
      account_id: whatsappAccount.account_id,
      column_id: defaultColumn.id
    });
    const nextPosition = Math.max(...leadsInColumn.map(l => l.position), 0) + 1;

    const leadData = {
      name: contactName,
      phone: fromNumber,
      message: messageText,
      platform: campaign?.platform || 'WhatsApp',
      channel: campaign?.channel || 'WhatsApp',
      campaign: campaign?.name || 'Não identificada',
      status: 'new',
      column_id: defaultColumn.id,
      position: nextPosition,
      account_id: whatsappAccount.account_id,
      metadata: {
        whatsapp_phone_id: whatsappAccount.phone_id,
        webhook_log_id: logId,
        campaign_match: match ? {
          phrase: match.phrase.phrase,
          confidence: match.confidence,
          match_type: match.matchType
        } : null
      }
    };

    memoryDb.createLead(leadData);
    console.log(`New lead created: ${contactName}`);

  } catch (error) {
    console.error('Error processing message:', error);
  }
}

module.exports = webhookController;