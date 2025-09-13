const { signToken, verifyToken as verifyJWT } = require('../utils/jwtUtils');
const memoryDb = require('../database/memory-db');

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
    let account = memoryDb.findAccount({ email, is_active: true });

    console.log('Account found:', !!account);

    // Se não encontrou, criar automaticamente
    if (!account) {
      console.log('Creating new account...');
      account = memoryDb.createAccount({
        name: email.split('@')[0],
        email: email,
        password: password, // Em produção, seria criptografado
        is_active: true
      });
      console.log('New account created:', account.id);
    }

    // Gerar token JWT
    const token = signToken(
      {
        id: account.id,
        email: account.email,
        name: account.name
      },
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email);

    // Retornar token e dados do usuário
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

    const decoded = verifyJWT(token);
    
    const account = memoryDb.findAccount({ id: decoded.id });
    
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