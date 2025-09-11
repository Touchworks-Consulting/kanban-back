const jwt = require('jsonwebtoken');
const { Account, User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso necessário' 
      });
    }

  // Usar mesmo fallback do authController
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const decodedAccountId = decoded && (decoded.accountId || decoded.id);
    if (!decodedAccountId) {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    const account = await Account.findOne({ where: { id: decodedAccountId, is_active: true } });
    if (!account) return res.status(401).json({ error: 'Conta não encontrada ou inativa' });
    let user = null;
    if (decoded.userId) {
      user = await User.findOne({ where: { id: decoded.userId, account_id: account.id, is_active: true } });
    } else if (decoded.email) {
      user = await User.findOne({ where: { email: decoded.email } });
    }
    req.account = account;
    if (user) req.user = user;
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
