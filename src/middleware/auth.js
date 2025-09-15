const { verifyToken: verifyJWT } = require('../utils/jwtUtils');
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

    const decoded = verifyJWT(token);
    
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
          attributes: ['id', 'name', 'display_name', 'description', 'avatar_url', 'plan', 'is_active']
        }]
      });
    } else if (decoded.email) {
      user = await User.findOne({
        where: { email: decoded.email, is_active: true },
        include: [{
          model: Account,
          as: 'currentAccount',
          attributes: ['id', 'name', 'display_name', 'description', 'avatar_url', 'plan', 'is_active']
        }]
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Buscar informações da conta atual e permissões
    let currentAccount = user.currentAccount;
    let userRole = 'member';
    let userPermissions = {};

    // Se não há conta atual definida, buscar a primeira conta ativa do usuário
    if (!currentAccount || !user.current_account_id) {
      console.log(`🔍 Usuário ${user.email} sem conta atual definida, buscando primeira conta ativa...`);

      const firstUserAccount = await UserAccount.findOne({
        where: { user_id: user.id, is_active: true },
        include: [{
          model: Account,
          as: 'account',
          where: { is_active: true }
        }]
      });

      if (firstUserAccount) {
        console.log(`✅ Definindo conta ${firstUserAccount.account.name} como atual para ${user.email}`);
        await user.update({ current_account_id: firstUserAccount.account.id });
        currentAccount = firstUserAccount.account;
        userRole = firstUserAccount.role;
        userPermissions = firstUserAccount.permissions || {};
      } else {
        console.log(`❌ Nenhuma conta ativa encontrada para usuário ${user.email}`);
        return res.status(401).json({ error: 'Usuário não possui acesso a nenhuma conta ativa' });
      }
    } else {
      // Buscar permissões da conta atual
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
      } else {
        console.log(`❌ Usuário ${user.email} não tem acesso à conta ${currentAccount.name}`);
        return res.status(403).json({ error: 'Acesso negado à conta atual' });
      }
    }

    req.user = user;
    req.account = currentAccount;
    req.userRole = userRole;
    req.userPermissions = userPermissions;
    next();
  } catch (error) {
    if (error.message.includes('Token expired')) {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }
    if (error.message.includes('Invalid token') || error.message.includes('Token verification failed')) {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    if (error.message.includes('JWT_SECRET must be set')) {
      console.error('CRITICAL: JWT_SECRET environment variable is not set');
      return res.status(500).json({
        error: 'Configuração de segurança inválida'
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
