const jwt = require('jsonwebtoken');
const { Account, User } = require('../models');

// Login somente para contas previamente registradas (sem criação automática)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    // Procurar usuário existente (pré-registrado)
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      // Não criar nada – reforça necessidade de registro prévio
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const account = await Account.findByPk(user.account_id);
    if (!account || !account.is_active) {
      return res.status(401).json({ success: false, message: 'Conta inativa' });
    }

    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    user.last_login_at = new Date();
    await user.save();

    const tokenPayload = {
      id: account.id,
      accountId: account.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });

    return res.json({
      token,
      user: {
        id: account.id,
        account_id: account.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Registro (cria nova conta + usuário owner)
const register = async (req, res) => {
  try {
    const { email, password, name, accountName, domain } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'email, password e name são obrigatórios' });
    }
    // Não permitir duplicar usuário
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    }
    // Também verificar se já existe conta com o mesmo email (modelo antigo)
    const existingAccount = await Account.findOne({ where: { email } });
    if (existingAccount) {
      return res.status(400).json({ success: false, message: 'Email já associado a uma conta' });
    }
    const account = await Account.create({ name: accountName || name || email.split('@')[0], email, is_active: true, settings: { domain: domain || null } });
    const user = await User.create({ account_id: account.id, name, email, password, role: 'owner' });

    const tokenPayload = { id: account.id, accountId: account.id, userId: user.id, email: user.email, name: user.name, role: user.role };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });

    return res.status(201).json({ token, user: { id: account.id, account_id: account.id, user_id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Refresh token simples (re-issue)
const refresh = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token necessário' });
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret', { ignoreExpiration: true });
    } catch {
      return res.status(401).json({ message: 'Token inválido' });
    }
    const account = await Account.findByPk(decoded.accountId || decoded.id);
    if (!account || !account.is_active) return res.status(401).json({ message: 'Conta inativa' });
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) return res.status(401).json({ message: 'Usuário inativo' });
    const newToken = jwt.sign({ id: account.id, accountId: account.id, userId: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });
    res.json({ token: newToken });
  } catch (e) {
    console.error('Refresh error:', e);
    res.status(500).json({ message: 'Erro interno' });
  }
};

// Logout (stateless, apenas resposta OK)
const logout = async (_req, res) => {
  res.json({ success: true });
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

  // Para compatibilidade com frontend que espera { account }
  res.json({ success: true, account: { id: account.id, name: account.name, email: account.email } });

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
  register,
  refresh,
  logout,
  verify: verifyToken
};
