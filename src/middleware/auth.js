const jwt = require('jsonwebtoken');
const { Account, User, UserAccount } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso necessário' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    if (!decoded.userId && !decoded.email) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Buscar usuário
    let user = null;
    if (decoded.userId) {
      user = await User.findOne({
        where: { id: decoded.userId, is_active: true },
        include: [{
          model: Account,
          as: 'currentAccount',
          attributes: ['id', 'name', 'display_name', 'is_active']
        }]
      });
    } else if (decoded.email) {
      user = await User.findOne({
        where: { email: decoded.email, is_active: true },
        include: [{
          model: Account,
          as: 'currentAccount',
          attributes: ['id', 'name', 'display_name', 'is_active']
        }]
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Se não há conta atual definida, definir a primeira conta do usuário
    if (!user.current_account_id) {
      const firstUserAccount = await UserAccount.findOne({
        where: { user_id: user.id, is_active: true },
        include: [{
          model: Account,
          as: 'account',
          where: { is_active: true }
        }]
      });

      if (firstUserAccount) {
        await user.update({ current_account_id: firstUserAccount.account.id });
        user.currentAccount = firstUserAccount.account;
      }
    }

    // Buscar informações da conta atual e permissões
    let currentAccount = user.currentAccount;
    let userRole = 'member';
    let userPermissions = {};

    if (currentAccount) {
      const userAccount = await UserAccount.findOne({
        where: {
          user_id: user.id,
          account_id: currentAccount.id,
          is_active: true
        }
      });

      if (userAccount) {
        userRole = userAccount.role;
        userPermissions = userAccount.permissions || {};
      }
    }

    req.user = user;
    req.account = currentAccount;
    req.userRole = userRole;
    req.userPermissions = userPermissions;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }
    
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Chave API necessária' 
      });
    }

    const account = await Account.findOne({
      where: { 
        api_key: apiKey,
        is_active: true 
      }
    });

    if (!account) {
      return res.status(401).json({ 
        error: 'Chave API inválida' 
      });
    }

    req.account = account;
    next();
  } catch (error) {
    console.error('Erro na autenticação por API key:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateApiKey
};
