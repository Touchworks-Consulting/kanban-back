const { WhatsAppAccount, WebhookLog } = require('../models');

module.exports = {
  list: async (req, res) => {
    try {
      const { is_active } = req.query;
      const where = { account_id: req.account.id };
      if (is_active !== undefined) where.is_active = is_active === 'true';
      const accounts = await WhatsAppAccount.findAll({ where });
      res.json({ success: true, accounts });
    } catch (e) {
      console.error('WA list error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  get: async (req, res) => {
    try {
      const account = await WhatsAppAccount.findOne({ where: { id: req.params.id, account_id: req.account.id } });
      if (!account) return res.status(404).json({ success: false, message: 'Não encontrado' });
      res.json({ success: true, account });
    } catch (e) {
      console.error('WA get error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  create: async (req, res) => {
    try {
      const { phone_id, account_name, phone_number } = req.body;
      if (!phone_id || !account_name || !phone_number) {
        return res.status(400).json({ success: false, code: 'VALIDATION', message: 'phone_id, account_name, phone_number obrigatórios', received: req.body });
      }
      const exists = await WhatsAppAccount.findOne({ where: { phone_id } });
      if (exists) return res.status(400).json({ success: false, code: 'DUPLICATE', message: 'phone_id já cadastrado' });
      const webhook_url = `${process.env.BASE_URL || 'http://localhost:3000'}/api/webhook/whatsapp`;
      const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'webhook_verify_token_123';
      const wa = await WhatsAppAccount.create({ account_id: req.account.id, phone_id, account_name, phone_number, webhook_url, verify_token });
      res.status(201).json({ success: true, account: wa });
    } catch (e) {
      console.error('WA create error', e);
      res.status(500).json({ success: false, code: 'EXCEPTION', message: 'Erro interno', error: e.message });
    }
  },
  update: async (req, res) => {
    try {
      const wa = await WhatsAppAccount.findOne({ where: { id: req.params.id, account_id: req.account.id } });
      if (!wa) return res.status(404).json({ success: false, message: 'Não encontrado' });
      const { phone_id, account_name, phone_number, is_active } = req.body;
      if (phone_id && phone_id !== wa.phone_id) {
        const exists = await WhatsAppAccount.findOne({ where: { phone_id } });
        if (exists) return res.status(400).json({ success: false, message: 'phone_id já cadastrado' });
        wa.phone_id = phone_id;
      }
      if (account_name !== undefined) wa.account_name = account_name;
      if (phone_number !== undefined) wa.phone_number = phone_number;
      if (is_active !== undefined) wa.is_active = is_active;
      await wa.save();
      res.json({ success: true, account: wa });
    } catch (e) {
      console.error('WA update error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  remove: async (req, res) => {
    try {
      const wa = await WhatsAppAccount.findOne({ where: { id: req.params.id, account_id: req.account.id } });
      if (!wa) return res.status(404).json({ success: false, message: 'Não encontrado' });
      await wa.destroy();
      res.json({ success: true, message: 'Removido' });
    } catch (e) {
      console.error('WA delete error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  testWebhook: async (req, res) => {
    try {
      const wa = await WhatsAppAccount.findOne({ where: { id: req.params.id, account_id: req.account.id } });
      if (!wa) return res.status(404).json({ success: false, message: 'Não encontrado' });
      const testMessage = { object: 'whatsapp_business_account', entry: [{ id: wa.phone_id, changes: [{ field: 'messages', value: { messages: [{ id: 'test', text: { body: 'Mensagem de teste' } }] } }] }] };
      await WebhookLog.create({ account_id: req.account.id, phone_id: wa.phone_id, event_type: 'test', payload: testMessage, processed: true });
      res.json({ success: true, message: 'Webhook de teste registrado', test_payload: testMessage });
    } catch (e) {
      console.error('WA test error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  logs: async (req, res) => {
    try {
      const wa = await WhatsAppAccount.findOne({ where: { id: req.params.id, account_id: req.account.id } });
      if (!wa) return res.status(404).json({ success: false, message: 'Não encontrado' });
      const { limit = 50 } = req.query;
      const logs = await WebhookLog.findAll({ where: { account_id: req.account.id, phone_id: wa.phone_id }, order: [['created_at','DESC']], limit: parseInt(limit) });
      res.json({ success: true, logs });
    } catch (e) {
      console.error('WA logs error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  }
};
