const { Account, User, UserAccount } = require('../models');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { isPlatformAdmin } = require('../utils/platformAdmin');

// Listar todas as contas do usuário logado
const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Platform admin (super admin) pode ver TODAS as contas
    if (isPlatformAdmin(userEmail)) {
      console.log(`🔑 Platform admin detectado: ${userEmail} - retornando todas as contas`);
      const allAccounts = await Account.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'display_name', 'description', 'avatar_url', 'plan', 'is_active'],
        order: [['created_at', 'ASC']]
      });

      const accounts = allAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        display_name: acc.display_name || acc.name,
        description: acc.description,
        avatar_url: acc.avatar_url,
        plan: acc.plan,
        role: 'owner', // Platform admin tem role owner em todas as contas
        permissions: {},
        is_active: acc.is_active
      }));

      return res.json({ accounts });
    }

    const userAccounts = await UserAccount.findAll({
      where: { 
        user_id: userId,
        is_active: true 
      },
      include: [{
        model: Account,
        as: 'account',
        attributes: ['id', 'name', 'display_name', 'description', 'avatar_url', 'plan', 'is_active']
      }],
      order: [['created_at', 'ASC']]
    });

    const accounts = userAccounts.map(ua => ({
      id: ua.account.id,
      name: ua.account.name,
      display_name: ua.account.display_name || ua.account.name,
      description: ua.account.description,
      avatar_url: ua.account.avatar_url,
      plan: ua.account.plan,
      role: ua.role,
      permissions: ua.permissions,
      is_active: ua.account.is_active
    }));

    res.json({ accounts });
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Trocar contexto de conta
const switchAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { accountId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!accountId) {
      return res.status(400).json({ error: 'ID da conta é obrigatório' });
    }

    const userEmail = req.user?.email;

    // Platform admin pode acessar qualquer conta
    if (isPlatformAdmin(userEmail)) {
      console.log(`🔑 Platform admin ${userEmail} trocando para conta: ${accountId}`);
      const account = await Account.findOne({
        where: { id: accountId, is_active: true }
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada ou inativa' });
      }

      await User.update(
        { current_account_id: accountId },
        { where: { id: userId } }
      );

      return res.json({
        success: true,
        account: {
          id: account.id,
          name: account.name,
          display_name: account.display_name || account.name,
          description: account.description,
          avatar_url: account.avatar_url,
          plan: account.plan,
          role: 'owner',
          permissions: {}
        }
      });
    }

    // Verificar se o usuário tem acesso à conta
    const userAccount = await UserAccount.findOne({
      where: { 
        user_id: userId,
        account_id: accountId,
        is_active: true 
      },
      include: [{
        model: Account,
        as: 'account',
        where: { is_active: true }
      }]
    });

    if (!userAccount) {
      return res.status(403).json({ error: 'Acesso negado à conta solicitada' });
    }

    // Atualizar conta atual do usuário
    await User.update(
      { current_account_id: accountId },
      { where: { id: userId } }
    );

    const account = userAccount.account;
    res.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        display_name: account.display_name || account.name,
        description: account.description,
        avatar_url: account.avatar_url,
        plan: account.plan,
        role: userAccount.role,
        permissions: userAccount.permissions
      }
    });
  } catch (error) {
    console.error('Error switching account:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar nova conta
const createAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, display_name, description, plan } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Nome da conta é obrigatório' });
    }

    console.log(`🔵 Criando conta para usuário: ${userId}, nome: ${name}`);

    // Abordagem simples: criar conta primeiro, depois UserAccount
    // Criar nova conta SEM transação primeiro
    const account = await Account.create({
      name,
      display_name: display_name || name,
      description,
      plan: plan || 'free',
      email: `account-${uuidv4().substring(0, 8)}@temp.com`, // Email temporário
      is_active: true,
      api_key: crypto.randomBytes(32).toString('hex'),
      settings: {}
    });

    console.log(`✅ Conta criada com ID: ${account.id}`);

    try {
      // Agora criar o UserAccount com a conta que já existe no banco
      const userAccount = await UserAccount.create({
        user_id: userId,
        account_id: account.id,
        role: 'owner',
        is_active: true,
        permissions: {
          manage_users: true,
          manage_settings: true,
          manage_billing: true,
          manage_integrations: true
        }
      });

      console.log(`✅ UserAccount criado: ${userAccount.id}`);

      // Definir como conta atual se for a primeira
      const currentUser = await User.findByPk(userId);
      if (!currentUser.current_account_id) {
        await currentUser.update({ current_account_id: account.id });
        console.log(`✅ Conta ${account.id} definida como atual para usuário ${userId}`);
      }

      res.status(201).json({
        account: {
          id: account.id,
          name: account.name,
          display_name: account.display_name,
          description: account.description,
          avatar_url: account.avatar_url,
          plan: account.plan,
          role: 'owner',
          permissions: {
            manage_users: true,
            manage_settings: true,
            manage_billing: true,
            manage_integrations: true
          },
          is_active: account.is_active
        }
      });

    } catch (userAccountError) {
      // Se falhar ao criar UserAccount, limpar a conta órfã
      console.error('Erro ao criar UserAccount, limpando conta:', userAccountError);
      await Account.destroy({ where: { id: account.id } });
      throw userAccountError;
    }

  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar conta
const updateAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { accountId } = req.params;
    const { name, display_name, description, avatar_url } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o usuário tem permissão para editar a conta
    const userAccount = await UserAccount.findOne({
      where: { 
        user_id: userId,
        account_id: accountId,
        is_active: true 
      }
    });

    if (!userAccount || (userAccount.role !== 'owner' && userAccount.role !== 'admin')) {
      return res.status(403).json({ error: 'Sem permissão para editar esta conta' });
    }

    // Atualizar conta
    await Account.update(
      { name, display_name, description, avatar_url },
      { where: { id: accountId } }
    );

    const updatedAccount = await Account.findByPk(accountId);
    
    res.json({
      account: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        display_name: updatedAccount.display_name,
        description: updatedAccount.description,
        avatar_url: updatedAccount.avatar_url,
        plan: updatedAccount.plan,
        role: userAccount.role,
        permissions: userAccount.permissions,
        is_active: updatedAccount.is_active
      }
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obter conta atual
const getCurrentAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    console.log(`🔍 getCurrentAccount: Buscando conta atual para usuário ${req.user?.email}`);

    // Usar a conta já validada pelo middleware de autenticação
    if (req.account) {
      console.log(`✅ Conta já validada pelo middleware: ${req.account.name}`);

      res.json({
        account: {
          id: req.account.id,
          name: req.account.name,
          display_name: req.account.display_name || req.account.name,
          description: req.account.description,
          avatar_url: req.account.avatar_url,
          plan: req.account.plan,
          role: req.userRole || 'member',
          permissions: req.userPermissions || {},
          is_active: req.account.is_active
        }
      });
      return;
    }

    // Fallback: Buscar conta manualmente se não foi definida pelo middleware
    console.log('⚠️ Conta não definida pelo middleware, buscando manualmente...');

    const user = await User.findByPk(userId, {
      include: [{
        model: Account,
        as: 'currentAccount',
        attributes: ['id', 'name', 'display_name', 'description', 'avatar_url', 'plan', 'is_active']
      }]
    });

    if (!user) {
      console.log(`❌ Usuário ${userId} não encontrado`);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se não tem conta atual, buscar primeira conta ativa
    if (!user.currentAccount || !user.current_account_id) {
      console.log('🔍 Buscando primeira conta ativa do usuário...');

      const firstUserAccount = await UserAccount.findOne({
        where: { user_id: userId, is_active: true },
        include: [{
          model: Account,
          as: 'account',
          where: { is_active: true }
        }]
      });

      if (firstUserAccount) {
        console.log(`✅ Definindo conta ${firstUserAccount.account.name} como atual`);
        await user.update({ current_account_id: firstUserAccount.account.id });

        res.json({
          account: {
            id: firstUserAccount.account.id,
            name: firstUserAccount.account.name,
            display_name: firstUserAccount.account.display_name || firstUserAccount.account.name,
            description: firstUserAccount.account.description,
            avatar_url: firstUserAccount.account.avatar_url,
            plan: firstUserAccount.account.plan,
            role: firstUserAccount.role,
            permissions: firstUserAccount.permissions || {},
            is_active: firstUserAccount.account.is_active
          }
        });
        return;
      } else {
        console.log(`❌ Nenhuma conta ativa encontrada para usuário ${user.email}`);
        return res.status(404).json({ error: 'Nenhuma conta ativa encontrada' });
      }
    }

    // Buscar permissões da conta atual
    const userAccount = await UserAccount.findOne({
      where: {
        user_id: userId,
        account_id: user.current_account_id,
        is_active: true
      }
    });

    if (!userAccount) {
      console.log(`❌ Usuário não tem acesso à conta ${user.current_account_id}`);
      return res.status(403).json({ error: 'Acesso negado à conta atual' });
    }

    const account = user.currentAccount;
    res.json({
      account: {
        id: account.id,
        name: account.name,
        display_name: account.display_name || account.name,
        description: account.description,
        avatar_url: account.avatar_url,
        plan: account.plan,
        role: userAccount.role,
        permissions: userAccount.permissions || {},
        is_active: account.is_active
      }
    });

  } catch (error) {
    console.error('Error fetching current account:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar API key (ofuscada para segurança)
const getApiKey = async (req, res) => {
  try {
    const accountId = req.params.id || req.account?.id;

    if (!accountId) {
      return res.status(400).json({ error: 'ID da conta é obrigatório' });
    }

    // Verificar se usuário tem permissão (owner ou admin)
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({
        error: 'Apenas proprietários e administradores podem visualizar API keys'
      });
    }

    const account = await Account.findByPk(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    // Verificar se usuário tem acesso à conta
    const userAccount = await UserAccount.findOne({
      where: {
        user_id: req.user.id,
        account_id: accountId,
        is_active: true
      }
    });

    if (!userAccount) {
      return res.status(403).json({ error: 'Você não tem acesso a esta conta' });
    }

    if (!account.api_key) {
      return res.status(404).json({
        error: 'Conta não possui API key',
        has_key: false
      });
    }

    // Ofuscar API key (mostrar apenas últimos 8 caracteres)
    const apiKey = account.api_key;
    const maskedKey = '•'.repeat(Math.max(0, apiKey.length - 8)) + apiKey.slice(-8);

    res.json({
      api_key: apiKey, // Retornar completa (será usada apenas quando revelar)
      masked_key: maskedKey,
      has_key: true
    });

  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Gerar ou regenerar API key para integração externa
const generateApiKey = async (req, res) => {
  try {
    const accountId = req.params.id || req.account?.id;

    if (!accountId) {
      return res.status(400).json({ error: 'ID da conta é obrigatório' });
    }

    // Verificar se usuário tem permissão (owner ou admin)
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({
        error: 'Apenas proprietários e administradores podem gerar API keys'
      });
    }

    const account = await Account.findByPk(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    // Verificar se usuário tem acesso à conta
    const userAccount = await UserAccount.findOne({
      where: {
        user_id: req.user.id,
        account_id: accountId,
        is_active: true
      }
    });

    if (!userAccount) {
      return res.status(403).json({ error: 'Você não tem acesso a esta conta' });
    }

    // Gerar nova API key (UUID v4)
    const apiKey = crypto.randomBytes(32).toString('hex');

    await account.update({ api_key: apiKey });

    res.json({
      message: 'API key gerada com sucesso',
      api_key: apiKey,
      warning: 'Guarde esta chave em local seguro. Ela não será mostrada novamente.'
    });

  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getUserAccounts,
  switchAccount,
  createAccount,
  updateAccount,
  getCurrentAccount,
  getApiKey,
  generateApiKey
};