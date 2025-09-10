const jwt = require('jsonwebtoken');
const { Account } = require('../models');

// Login simples com email e senha
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email, password: '***' });

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }

    // Buscar conta pelo email
    let account = await Account.findOne({
      where: { 
        email: email,
        is_active: true 
      }
    });

    console.log('Account found:', !!account);

    // Se não encontrou, criar automaticamente
    if (!account) {
      console.log('Creating new account...');
      // A senha será criptografada pelo hook beforeCreate no modelo
      account = await Account.create({
        name: email.split('@')[0],
        email: email,
        password: password,
        is_active: true
      });
      console.log('New account created:', account.id);
    } else {
      // Verificar senha
      const isMatch = await account.validPassword(password);
      if (!isMatch) {
        console.log('Password mismatch for user:', email);
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciais inválidas' 
        });
      }
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: account.id,
        email: account.email,
        name: account.name 
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email);

    // Retornar diretamente o token e os dados do usuário
    res.json({
      token,
      user: {
        id: account.id,
        name: account.name,
        email: account.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Verificar token
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    const account = await Account.findByPk(decoded.id);
    
    if (!account || !account.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: account.id,
          name: account.name,
          email: account.email
        }
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

module.exports = {
  login,
  verify: verifyToken
};
