const { Account, User } = require('../models');
const OTPService = require('../services/OTPService');

/**
 * POST /api/auth/forgot-password
 * Envia OTP via WhatsApp para recuperação de senha
 */
const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }

    // Normalizar telefone (remover espaços, adicionar +55 se necessário)
    const normalizedPhone = normalizePhone(phone);

    // Verificar se telefone existe no sistema (Account ou User)
    const user = await User.findOne({ where: { phone: normalizedPhone } });
    const account = await Account.findOne({ where: { phone: normalizedPhone } });

    // IMPORTANTE: Não revelar se telefone existe ou não (segurança)
    // Sempre retorna sucesso mesmo se não encontrar

    if (user || account) {
      // Enviar OTP apenas se telefone existe
      const result = await OTPService.sendOTP(normalizedPhone);

      if (!result.success) {
        console.error('Erro ao enviar OTP:', result.message);
        // Não revelar erro ao usuário
      }
    }

    // Sempre retorna a mesma mensagem
    return res.json({
      success: true,
      message: 'Se esse telefone estiver cadastrado, você receberá um código via WhatsApp'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Valida OTP e redefine senha
 */
const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Telefone, OTP e nova senha são obrigatórios'
      });
    }

    // Validar força da senha
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Senha deve ter no mínimo 6 caracteres'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // 1. Validar OTP
    const otpValidation = await OTPService.validateOTP(normalizedPhone, otp);

    if (!otpValidation.success) {
      return res.status(401).json({
        success: false,
        message: otpValidation.message
      });
    }

    // 2. Buscar usuário pelo telefone
    let user = await User.findOne({ where: { phone: normalizedPhone } });

    if (!user) {
      // Buscar por Account (modelo antigo)
      const account = await Account.findOne({ where: { phone: normalizedPhone } });

      if (account) {
        // Atualizar senha da Account
        account.password = newPassword;
        await account.save();

        return res.json({
          success: true,
          message: 'Senha redefinida com sucesso'
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // 3. Atualizar senha do usuário
    user.password = newPassword;
    await user.save();

    // 4. Log da atividade (opcional)
    console.log(`Senha redefinida para usuário: ${user.email}`);

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Apenas valida OTP sem redefinir senha (para UI)
 */
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Telefone e OTP são obrigatórios'
      });
    }

    const normalizedPhone = normalizePhone(phone);
    const result = await OTPService.validateOTP(normalizedPhone, otp);

    if (result.success) {
      return res.json({ success: true, message: 'OTP válido' });
    }

    return res.status(401).json({
      success: false,
      message: result.message
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Helper para normalizar telefone
function normalizePhone(phone) {
  // Remove espaços, traços, parênteses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Adiciona +55 se não tiver código do país
  if (!cleaned.startsWith('+')) {
    cleaned = '+55' + cleaned;
  }

  return cleaned;
}

module.exports = {
  forgotPassword,
  resetPassword,
  verifyOTP
};