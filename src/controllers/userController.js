const { User, UserAccount } = require('../models');
const cacheService = require('../services/CacheService');

// Helper functions para telefone
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

function requireAdmin(req, res) {
  if (!req.user || !['owner','admin'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Permissão negada' });
    return false;
  }
  return true;
}

module.exports = {
  list: async (req, res) => {
    try {
      const accountId = req.account.id;

      // 📦 Tentar buscar do cache primeiro
      const cachedUsers = await cacheService.getUsersCache(accountId);
      if (cachedUsers) {
        console.log(`📦 Cache HIT: users para conta ${accountId}`);
        return res.json({ success: true, users: cachedUsers });
      }

      // Cache MISS - buscar do banco
      console.log(`📦 Cache MISS: buscando users do banco para conta ${accountId}`);
      const users = await User.findAll({ where: { account_id: accountId } });

      // Armazenar no cache
      await cacheService.setUsersCache(accountId, users);

      res.json({ success: true, users });
    } catch (e) {
      console.error('List users error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  me: async (req, res) => {
    res.json({ success: true, user: req.user });
  },
  create: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { name, email, password, phone, role = 'member', account_id } = req.body;
      if (!name || !email || !password || !phone) return res.status(400).json({ success: false, message: 'name, email, password e phone obrigatórios' });

      // Usar account_id do payload se fornecido, senão usar req.account.id
      const targetAccountId = account_id || req.account.id;
      console.log(`🔍 Creating user with account_id: ${targetAccountId} (from payload: ${account_id}, from req.account: ${req.account.id})`);

      // Validar formato do telefone
      const normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Telefone inválido. Use formato +5511999999999'
        });
      }

      // Verificar se email já existe
      const existsEmail = await User.findOne({ where: { email } });
      if (existsEmail) return res.status(400).json({ success: false, message: 'Email já em uso' });

      // Verificar se telefone já existe
      const existsPhone = await User.findOne({ where: { phone: normalizedPhone } });
      if (existsPhone) return res.status(400).json({ success: false, message: 'Telefone já cadastrado' });

      const user = await User.create({
        account_id: targetAccountId,
        name,
        email,
        password,
        phone: normalizedPhone,
        role,
        current_account_id: targetAccountId
      });

      // Criar entrada na tabela UserAccount para compatibilidade multi-tenant
      console.log(`🔗 Criando relação UserAccount para multi-tenant (user_id: ${user.id}, account_id: ${targetAccountId})`);
      await UserAccount.create({
        user_id: user.id,
        account_id: targetAccountId,
        role: role,
        is_active: true,
        permissions: {}
      });
      console.log(`✅ UserAccount criado para multi-tenant compatibility`);

      // 🔄 Invalidar cache após criação (usar targetAccountId para ser consistente)
      await cacheService.invalidateUsersCache(targetAccountId);
      console.log(`📦 Cache INVALIDATED: users para conta ${targetAccountId} após criação`);

      res.status(201).json({ success: true, user });
    } catch (e) {
      console.error('Create user error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  update: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { id } = req.params;
      const { name, role, password, is_active } = req.body;
      const user = await User.findOne({ where: { id, account_id: req.account.id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      if (name !== undefined) user.name = name;
      if (role !== undefined) user.role = role;
      if (password) user.password = password; // hook re-hash
      if (is_active !== undefined) user.is_active = is_active;
      await user.save();

      // 🔄 Invalidar cache após atualização
      await cacheService.invalidateUsersCache(req.account.id);
      console.log(`📦 Cache INVALIDATED: users para conta ${req.account.id} após atualização`);

      res.json({ success: true, user });
    } catch (e) {
      console.error('Update user error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  remove: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { id } = req.params;
      const user = await User.findOne({ where: { id, account_id: req.account.id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      user.is_active = false;
      await user.save();

      // 🔄 Invalidar cache após desativação
      await cacheService.invalidateUsersCache(req.account.id);
      console.log(`📦 Cache INVALIDATED: users para conta ${req.account.id} após desativação`);

      res.json({ success: true, message: 'Usuário desativado' });
    } catch (e) {
      console.error('Remove user error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  resetPassword: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Nova senha é obrigatória'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Senha deve ter no mínimo 6 caracteres'
        });
      }

      const user = await User.findOne({ where: { id, account_id: req.account.id } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se não está tentando alterar a própria senha (deve usar o fluxo normal)
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível redefinir sua própria senha por aqui. Use a funcionalidade de trocar senha.'
        });
      }

      // Atualizar senha (o hook do model irá fazer o hash automaticamente)
      user.password = newPassword;
      await user.save();

      // Log da atividade
      console.log(`Admin ${req.user.email} (${req.user.id}) redefiniu senha do usuário ${user.email} (${user.id})`);

      // 🔄 Invalidar cache após atualização
      await cacheService.invalidateUsersCache(req.account.id);
      console.log(`📦 Cache INVALIDATED: users para conta ${req.account.id} após reset de senha`);

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } catch (e) {
      console.error('Reset password error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },

  requestPhoneVerification: async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Telefone é obrigatório'
        });
      }

      const normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Telefone inválido. Use formato +5511999999999'
        });
      }

      // Enviar OTP usando o sistema existente
      const OTPService = require('../services/OTPService');
      const otpResult = await OTPService.sendOTP(normalizedPhone);

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: otpResult.message || 'Erro ao enviar código OTP'
        });
      }

      // Log da atividade
      console.log(`OTP para verificação de telefone enviado para ${normalizedPhone} (usuário: ${req.user.id})`);

      res.json({
        success: true,
        message: 'Código enviado via WhatsApp'
      });
    } catch (e) {
      console.error('Request phone verification error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },

  verifyPhone: async (req, res) => {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Telefone e código OTP são obrigatórios'
        });
      }

      // Normalizar telefone
      const normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Telefone inválido. Use formato +5511999999999'
        });
      }

      // Verificar OTP usando o sistema existente
      const OTPService = require('../services/OTPService');
      const otpResult = await OTPService.validateOTP(normalizedPhone, otp);

      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: otpResult.message || 'Código OTP inválido ou expirado'
        });
      }

      // Atualizar telefone do usuário e marcar como verificado
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      user.phone = normalizedPhone;
      user.phone_verified = true;
      await user.save();

      // Log da atividade
      console.log(`Usuário ${user.email} (${user.id}) verificou telefone ${normalizedPhone} via OTP`);

      // 🔄 Invalidar cache após atualização
      await cacheService.invalidateUsersCache(user.account_id);
      console.log(`📦 Cache INVALIDATED: users para conta ${user.account_id} após verificação telefone`);

      // Retornar usuário atualizado
      const updatedUser = await User.findByPk(req.user.id);

      res.json({
        success: true,
        message: 'Telefone verificado com sucesso',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          phone_verified: updatedUser.phone_verified,
          role: updatedUser.role,
          account_id: updatedUser.account_id
        }
      });
    } catch (e) {
      console.error('Verify phone error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  }
};
