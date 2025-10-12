const { signToken, verifyToken: verifyJWT } = require('../utils/jwtUtils');
const { Account, User, UserAccount } = require('../models');

// Login somente para contas previamente registradas (sem criação automática)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 LOGIN: Tentativa de login para: ${email}`);

    if (!email || !password) {
      console.log('❌ Email ou senha não fornecidos');
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    // Procurar usuário existente (pré-registrado)
    console.log(`🔍 Buscando usuário: ${email}`);
    const user = await User.findOne({ where: { email, is_active: true } });

    if (!user) {
      console.log(`❌ Usuário não encontrado ou inativo: ${email}`);
      // Não criar nada – reforça necessidade de registro prévio
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    console.log(`✅ Usuário encontrado: ${user.name} (ID: ${user.id})`);
    console.log(`📋 Detalhes: role=${user.role}, account_id=${user.account_id}, current_account_id=${user.current_account_id}`);

    console.log(`🏢 Buscando conta: ${user.account_id}`);
    const account = await Account.findByPk(user.account_id);
    if (!account) {
      console.log(`❌ Conta não encontrada: ${user.account_id}`);
      return res.status(401).json({ success: false, message: 'Conta não encontrada' });
    }

    if (!account.is_active) {
      console.log(`❌ Conta inativa: ${account.name} (ID: ${account.id})`);
      return res.status(401).json({ success: false, message: 'Conta inativa' });
    }

    console.log(`✅ Conta encontrada e ativa: ${account.name} (ID: ${account.id})`);

    console.log('🔑 Validando senha...');
    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      console.log('❌ Senha inválida');
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    console.log('✅ Senha válida');

    console.log('💾 Atualizando last_login_at...');
    user.last_login_at = new Date();
    await user.save();

    console.log('🎫 Criando token JWT...');
    const tokenPayload = {
      id: account.id,
      accountId: account.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    console.log('📝 Token payload:', tokenPayload);
    const token = signToken(tokenPayload, { expiresIn: '24h' });

    console.log('✅ Login realizado com sucesso para:', user.email);
    return res.json({
      token,
      user: {
        id: account.id,
        account_id: account.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phone_verified: user.phone_verified,
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
    const { email, password, name, accountName, domain, phone } = req.body;
    console.log(`🔐 REGISTER: Tentativa de registro para: ${email}`);

    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email, senha, nome e telefone são obrigatórios'
      });
    }

    // Não permitir duplicar usuário
    console.log(`🔍 Verificando se usuário já existe: ${email}`);
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log(`❌ Usuário já existe: ${email}`);
      return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    }
    console.log(`✅ Usuário não existe: ${email}`);

    // Também verificar se já existe conta com o mesmo email (modelo antigo)
    console.log(`🔍 Verificando se conta já existe: ${email}`);
    const existingAccount = await Account.findOne({ where: { email } });
    if (existingAccount) {
      console.log(`❌ Conta já existe: ${email} - ID: ${existingAccount.id}, Name: ${existingAccount.name}`);
      return res.status(400).json({ success: false, message: 'Email já associado a uma conta' });
    }
    console.log(`✅ Conta não existe: ${email}`);

    // Validar formato do telefone
    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Telefone inválido. Use formato +5511999999999'
      });
    }

    // Verificar se telefone já existe
    const existingPhone = await User.findOne({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone já cadastrado'
      });
    }

    console.log(`💾 Criando nova conta para: ${email}`);
    const account = await Account.create({
      name: accountName || name || email.split('@')[0],
      email,
      phone: normalizedPhone,
      is_active: true,
      settings: { domain: domain || null }
    });
    console.log(`✅ Conta criada: ID=${account.id}, Name=${account.name}, Email=${account.email}`);

    console.log(`👤 Criando usuário owner para conta: ${account.id}`);
    const user = await User.create({
      account_id: account.id,
      name,
      email,
      password,
      phone: normalizedPhone,
      role: 'owner',
      current_account_id: account.id  // Define a conta atual
    });
    console.log(`✅ Usuário criado: ID=${user.id}, Name=${user.name}, Role=${user.role}`);

    // Criar entrada na tabela UserAccount para compatibilidade multi-tenant
    console.log(`🔗 Criando relação UserAccount para multi-tenant`);
    await UserAccount.create({
      user_id: user.id,
      account_id: account.id,
      role: 'owner',
      is_active: true,
      permissions: {}
    });
    console.log(`✅ UserAccount criado para multi-tenant compatibility`);

    const tokenPayload = { id: account.id, accountId: account.id, userId: user.id, email: user.email, name: user.name, role: user.role };
    const token = signToken(tokenPayload, { expiresIn: '24h' });

    console.log(`🎫 Token gerado para registro: ${user.email}`);
    console.log(`✅ Registro completo para: ${user.email}`);
    return res.status(201).json({ token, user: { id: account.id, account_id: account.id, user_id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Refresh token - agora com validação adequada de expiração
const refresh = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token necessário' });
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded;

    try {
      // Permitir tokens expirados APENAS para refresh (janela de graça de 24h)
      decoded = verifyJWT(token, { ignoreExpiration: true });

      // Verificar se o token não está muito expirado (máximo 24h após expiração)
      const now = Math.floor(Date.now() / 1000);
      const maxAge = decoded.exp + (24 * 60 * 60); // 24h após expiração

      if (now > maxAge) {
        return res.status(401).json({ message: 'Token expirado há muito tempo. Faça login novamente.' });
      }

    } catch (error) {
      console.error('Token verification failed in refresh:', error);
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Validar se conta e usuário ainda existem e estão ativos
    const account = await Account.findByPk(decoded.accountId || decoded.id);
    if (!account || !account.is_active) {
      return res.status(401).json({ message: 'Conta inativa' });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Usuário inativo' });
    }

    // Gerar novo token com expiração renovada
    const tokenPayload = {
      id: account.id,
      accountId: account.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const newToken = signToken(tokenPayload, { expiresIn: '24h' });

    res.json({
      token: newToken,
      user: {
        id: account.id,
        account_id: account.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phone_verified: user.phone_verified,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Refresh error:', error);
    if (error.message.includes('JWT_SECRET must be set')) {
      return res.status(500).json({ message: 'Configuração de segurança inválida' });
    }
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Logout (stateless, apenas resposta OK)
const logout = async (_req, res) => {
  res.json({ success: true });
};

// Verificar token
const verifyTokenEndpoint = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
    }

    const decoded = verifyJWT(token);
    
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

// Helper functions
function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+55' + cleaned;
  }
  return cleaned;
}

function isValidPhone(phone) {
  // E.164 format: +[country code][number]
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  verify: verifyTokenEndpoint
};
