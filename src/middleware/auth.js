const jwt = require('jsonwebtoken');
const { Account } = require('../models');

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
    const decodedId = decoded && (decoded.id || decoded.accountId || (decoded.user && decoded.user.id));
    if (!decodedId) {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    
    // Verificar se a conta ainda existe e está ativa
    const account = await Account.findOne({
      where: { 
  // authController assina com { id, email, name }, mas damos fallback
  id: decodedId,
        is_active: true 
      }
    });

    if (!account) {
      return res.status(401).json({ 
        error: 'Conta não encontrada ou inativa' 
      });
    }

    req.account = account;
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
