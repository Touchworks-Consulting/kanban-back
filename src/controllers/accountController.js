const { Account, User, UserAccount } = require('../models');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Listar todas as contas do usuário logado
const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
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

    // Criar nova conta
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

    // Adicionar usuário como owner da nova conta
    await UserAccount.create({
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

    // Definir como conta atual se for a primeira
    const currentUser = await User.findByPk(userId);
    if (!currentUser.current_account_id) {
      await currentUser.update({ current_account_id: account.id });
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

    const user = await User.findByPk(userId, {
      include: [{
        model: Account,
        as: 'currentAccount',
        attributes: ['id', 'name', 'display_name', 'description', 'avatar_url', 'plan', 'is_active']
      }]
    });

    if (!user || !user.currentAccount) {
      return res.status(404).json({ error: 'Conta atual não encontrada' });
    }

    const userAccount = await UserAccount.findOne({
      where: { 
        user_id: userId,
        account_id: user.current_account_id,
        is_active: true 
      }
    });

    const account = user.currentAccount;
    res.json({
      account: {
        id: account.id,
        name: account.name,
        display_name: account.display_name || account.name,
        description: account.description,
        avatar_url: account.avatar_url,
        plan: account.plan,
        role: userAccount?.role || 'member',
        permissions: userAccount?.permissions || {},
        is_active: account.is_active
      }
    });
  } catch (error) {
    console.error('Error fetching current account:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getUserAccounts,
  switchAccount,
  createAccount,
  updateAccount,
  getCurrentAccount
};