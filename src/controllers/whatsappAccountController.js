const WhatsAppAccountController = (campaignModels) => {
  // Get all WhatsApp accounts
  const getAccounts = (req, res) => {
    try {
      const accountId = req.account?.id || '01905c91-0664-434d-83b6-cb372d3dc5b3';
      const { is_active } = req.query;
      
      const criteria = { account_id: accountId };
      if (is_active !== undefined) {
        criteria.is_active = is_active === 'true';
      }

      const accounts = campaignModels.findWhatsappAccounts(criteria);
      
      res.json({
        success: true,
        accounts: accounts
      });
    } catch (error) {
      console.error('Error getting WhatsApp accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Get single WhatsApp account
  const getAccount = (req, res) => {
    try {
      const { id } = req.params;
      
      for (const account of campaignModels.whatsappAccounts.values()) {
        if (account.id === id) {
          return res.json({
            success: true,
            account: account
          });
        }
      }
      
      res.status(404).json({
        success: false,
        error: 'Conta WhatsApp não encontrada'
      });
    } catch (error) {
      console.error('Error getting WhatsApp account:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Create WhatsApp account
  const createAccount = (req, res) => {
    try {
      const accountId = req.account?.id || '01905c91-0664-434d-83b6-cb372d3dc5b3';
      const { phone_id, account_name, phone_number } = req.body;

      if (!phone_id || !account_name || !phone_number) {
        return res.status(400).json({
          success: false,
          error: 'phone_id, account_name e phone_number são obrigatórios'
        });
      }

      // Check if phone_id already exists
      const existingAccount = campaignModels.findWhatsappAccountByPhoneId(phone_id);
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          error: 'Já existe uma conta com este phone_id'
        });
      }

      const accountData = {
        phone_id,
        account_name,
        phone_number,
        webhook_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/webhook/whatsapp`,
        verify_token: process.env.WHATSAPP_VERIFY_TOKEN || 'webhook_verify_token_123',
        access_token: '', // Não necessário para recebimento de webhooks
        is_active: true,
        account_id: accountId
      };

      const newAccount = campaignModels.createWhatsappAccount(accountData);
      
      console.log(`Nova conta WhatsApp criada: ${account_name} (${phone_id})`);
      
      res.status(201).json({
        success: true,
        account: newAccount
      });
    } catch (error) {
      console.error('Error creating WhatsApp account:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Update WhatsApp account
  const updateAccount = (req, res) => {
    try {
      const { id } = req.params;
      const { phone_id, account_name, phone_number, is_active } = req.body;

      // Check if phone_id already exists (excluding current account)
      if (phone_id) {
        const existingAccount = campaignModels.findWhatsappAccountByPhoneId(phone_id);
        if (existingAccount && existingAccount.id !== id) {
          return res.status(400).json({
            success: false,
            error: 'Já existe uma conta com este phone_id'
          });
        }
      }

      const updateData = {};
      if (phone_id !== undefined) updateData.phone_id = phone_id;
      if (account_name !== undefined) updateData.account_name = account_name;
      if (phone_number !== undefined) updateData.phone_number = phone_number;
      if (is_active !== undefined) updateData.is_active = is_active;

      const updatedAccount = campaignModels.updateWhatsappAccount(id, updateData);
      
      if (!updatedAccount) {
        return res.status(404).json({
          success: false,
          error: 'Conta WhatsApp não encontrada'
        });
      }

      console.log(`Conta WhatsApp atualizada: ${updatedAccount.account_name} (${updatedAccount.phone_id})`);

      res.json({
        success: true,
        account: updatedAccount
      });
    } catch (error) {
      console.error('Error updating WhatsApp account:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Delete WhatsApp account
  const deleteAccount = (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = campaignModels.deleteWhatsappAccount(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Conta WhatsApp não encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Conta WhatsApp deletada com sucesso'
      });
    } catch (error) {
      console.error('Error deleting WhatsApp account:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Test webhook connection
  const testWebhook = (req, res) => {
    try {
      const { id } = req.params;
      
      const account = campaignModels.whatsappAccounts.get(id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Conta WhatsApp não encontrada'
        });
      }

      // Simulate a test webhook call
      const testMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: account.phone_id,
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: account.phone_number,
                phone_number_id: account.phone_id
              },
              messages: [{
                from: '5511999999999',
                id: 'test_message_id',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: 'Mensagem de teste do sistema' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      // Log test webhook
      campaignModels.createWebhookLog({
        phone_id: account.phone_id,
        account_id: account.account_id,
        event_type: 'test',
        payload: testMessage,
        processed: true,
        campaign_matched: null,
        lead_created: false,
        error: null
      });

      res.json({
        success: true,
        message: 'Webhook de teste enviado com sucesso',
        test_payload: testMessage
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Get webhook logs for account
  const getWebhookLogs = (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;
      
      const account = campaignModels.whatsappAccounts.get(id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Conta WhatsApp não encontrada'
        });
      }

      const logs = campaignModels.findWebhookLogs({
        phone_id: account.phone_id,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        logs: logs
      });
    } catch (error) {
      console.error('Error getting webhook logs:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  return {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    testWebhook,
    getWebhookLogs
  };
};

module.exports = WhatsAppAccountController;