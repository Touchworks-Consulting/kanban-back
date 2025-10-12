const axios = require('axios');

const OTP_LAMBDA_URL = 'https://dg1s6ify35.execute-api.us-east-1.amazonaws.com/default/request-validate-otp-whatsapp';

class OTPService {
  /**
   * Envia OTP via WhatsApp
   * @param {string} phoneNumber - Formato: +5511999999999
   * @returns {Promise<{success: boolean, message: string, code?: string}>}
   */
  static async sendOTP(phoneNumber) {
    try {
      const response = await axios.post(OTP_LAMBDA_URL, {
        action: 'send',
        phone_number: phoneNumber
      });

      if (response.data.OTP_code === 'OTP_507') {
        return { success: true, message: 'OTP enviado com sucesso' };
      }

      return { success: false, message: 'Erro ao enviar OTP' };
    } catch (error) {
      console.error('OTP Send Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao enviar OTP'
      };
    }
  }

  /**
   * Valida OTP
   * @param {string} phoneNumber - Formato: +5511999999999
   * @param {string} otp - Código de 6 dígitos
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async validateOTP(phoneNumber, otp) {
    try {
      const response = await axios.post(OTP_LAMBDA_URL, {
        action: 'validate',
        phone_number: phoneNumber,
        otp: otp
      });

      if (response.data.OTP_code === 'OTP_512') {
        return { success: true, message: 'OTP validado com sucesso' };
      }

      return { success: false, message: 'OTP inválido ou expirado' };
    } catch (error) {
      console.error('OTP Validation Error:', error);

      // Tratar códigos de erro específicos
      const otpCode = error.response?.data?.OTP_code;

      if (otpCode === 'OTP_511') {
        return { success: false, message: 'OTP inválido ou expirado' };
      }
      if (otpCode === 'OTP_510') {
        return { success: false, message: 'Nenhum OTP encontrado para esse telefone' };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao validar OTP'
      };
    }
  }
}

module.exports = OTPService;