const UserSession = require('../models/UserSession');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SessionManager {

  // Gerar um hash único para o token JWT
  static generateTokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Extrair informações do dispositivo/navegador
  static extractDeviceInfo(req) {
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;

    // Parse básico do User-Agent
    const deviceInfo = {
      browser: 'unknown',
      os: 'unknown',
      device: 'unknown'
    };

    if (userAgent) {
      // Detecção simples de navegador
      if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
      else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
      else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
      else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';

      // Detecção simples de OS
      if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
      else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
      else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
      else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
      else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';

      // Detecção simples de dispositivo
      if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
      else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
      else deviceInfo.device = 'Desktop';
    }

    return {
      user_agent: userAgent,
      ip_address: ip,
      device_info: deviceInfo,
      browser_fingerprint: crypto
        .createHash('md5')
        .update(`${userAgent}${ip}`)
        .digest('hex')
    };
  }

  // Criar nova sessão no login
  static async createSession(accountId, token, req, userId = null) {
    try {
      const tokenHash = this.generateTokenHash(token);
      const deviceInfo = this.extractDeviceInfo(req);

      // Define expiração do token (24h)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Primeiro, força logout de outras sessões ativas do mesmo usuário
      await UserSession.forceLogoutOtherSessions(accountId, tokenHash, userId);

      // Cria nova sessão
      const session = await UserSession.create({
        account_id: accountId,
        user_id: userId,
        session_token: tokenHash,
        ip_address: deviceInfo.ip_address,
        user_agent: deviceInfo.user_agent,
        browser_fingerprint: deviceInfo.browser_fingerprint,
        device_info: deviceInfo.device_info,
        expires_at: expiresAt,
        last_activity: new Date(),
        metadata: {
          login_method: 'api_key',
          forced_logout_others: true
        }
      });

      console.log(`🔐 Nova sessão criada para conta ${accountId}:`, {
        session_id: session.id,
        device: deviceInfo.device_info.browser,
        os: deviceInfo.device_info.os,
        ip: deviceInfo.ip_address
      });

      return session;

    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  // Validar sessão no middleware de autenticação
  static async validateSession(token, accountId) {
    try {
      const tokenHash = this.generateTokenHash(token);

      const session = await UserSession.scope('active').findOne({
        where: {
          session_token: tokenHash,
          account_id: accountId
        }
      });

      if (!session) {
        return {
          valid: false,
          reason: 'session_not_found'
        };
      }

      // Atualizar última atividade
      await session.update({
        last_activity: new Date()
      });

      return {
        valid: true,
        session: session
      };

    } catch (error) {
      console.error('Erro ao validar sessão:', error);
      return {
        valid: false,
        reason: 'validation_error'
      };
    }
  }

  // Invalidar sessão no logout
  static async invalidateSession(token, accountId) {
    try {
      const tokenHash = this.generateTokenHash(token);

      const result = await UserSession.update(
        {
          is_active: false,
          logout_at: new Date()
        },
        {
          where: {
            session_token: tokenHash,
            account_id: accountId,
            is_active: true
          }
        }
      );

      return result[0] > 0; // Retorna true se alguma sessão foi atualizada

    } catch (error) {
      console.error('Erro ao invalidar sessão:', error);
      return false;
    }
  }

  // Obter sessões ativas de uma conta
  static async getActiveSessions(accountId) {
    try {
      const sessions = await UserSession.scope('active').findAll({
        where: { account_id: accountId },
        order: [['last_activity', 'DESC']],
        attributes: [
          'id', 'ip_address', 'device_info', 'login_at',
          'last_activity', 'browser_fingerprint'
        ]
      });

      return sessions.map(session => ({
        id: session.id,
        ip_address: session.ip_address,
        device_info: session.device_info,
        login_at: session.login_at,
        last_activity: session.last_activity,
        is_current: false // Será marcado pelo controller se for a sessão atual
      }));

    } catch (error) {
      console.error('Erro ao buscar sessões ativas:', error);
      return [];
    }
  }

  // Forçar logout de uma sessão específica
  static async forceLogoutSession(sessionId, accountId, reason = 'admin_action') {
    try {
      const result = await UserSession.update(
        {
          is_active: false,
          logout_at: new Date(),
          force_logout_reason: reason
        },
        {
          where: {
            id: sessionId,
            account_id: accountId,
            is_active: true
          }
        }
      );

      return result[0] > 0;

    } catch (error) {
      console.error('Erro ao forçar logout da sessão:', error);
      return false;
    }
  }

  // Limpar sessões expiradas (para rodar em cron job)
  static async cleanupExpiredSessions() {
    try {
      const cleanedCount = await UserSession.cleanExpiredSessions();

      if (cleanedCount > 0) {
        console.log(`🧹 Limpas ${cleanedCount} sessões expiradas`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('Erro ao limpar sessões expiradas:', error);
      return 0;
    }
  }

  // Middleware para interceptar requisições e validar sessão
  static authMiddleware() {
    return async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Token não fornecido',
            code: 'NO_TOKEN'
          });
        }

        // Validar JWT básico primeiro
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
          return res.status(401).json({
            success: false,
            error: 'Token inválido',
            code: 'INVALID_TOKEN'
          });
        }

        // Validar sessão no banco
        const sessionValidation = await this.validateSession(token, decoded.accountId);

        if (!sessionValidation.valid) {
          let errorMessage = 'Sessão inválida';
          let errorCode = 'INVALID_SESSION';

          if (sessionValidation.reason === 'session_not_found') {
            errorMessage = 'Sua sessão expirou ou foi encerrada. Faça login novamente.';
            errorCode = 'SESSION_EXPIRED';
          }

          return res.status(401).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            force_logout: true
          });
        }

        // Adicionar informações da sessão ao request
        req.user = decoded;
        req.session = sessionValidation.session;

        next();

      } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    };
  }
}

module.exports = SessionManager;