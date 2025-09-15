const rateLimit = require('express-rate-limit');

/**
 * Rate limiting escalável para centenas de usuários simultâneos
 *
 * Estratégia:
 * - Limites por usuário autenticado ao invés de IP
 * - Limites diferenciados por tipo de operação
 * - Limites globais altos para suportar escala
 */

// Key generator baseado em usuário autenticado
const userKeyGenerator = (req) => {
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  // Fallback para IP se não autenticado
  return `ip:${req.ip}`;
};

// Key generator baseado em conta para recursos compartilhados
const accountKeyGenerator = (req) => {
  if (req.account && req.account.id) {
    return `account:${req.account.id}`;
  }
  return userKeyGenerator(req);
};

/**
 * Rate limiter para APIs de leitura (GET)
 * Limites altos pois são operações seguras
 */
const readApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 2000, // 2000 requests por minuto por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: {
    error: 'Muitas consultas. Aguarde um momento.',
    retryAfter: 60
  }
});

/**
 * Rate limiter para APIs de escrita (POST/PUT/DELETE)
 * Limites médios para evitar spam mas permitir uso normal
 */
const writeApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 500, // 500 requests por minuto por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: {
    error: 'Muitas operações de escrita. Aguarde um momento.',
    retryAfter: 60
  }
});

/**
 * Rate limiter para dashboard
 * Limites muito altos pois dashboard faz múltiplas requisições simultâneas
 */
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 3000, // 3000 requests por minuto por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: {
    error: 'Dashboard temporariamente limitado. Aguarde um momento.',
    retryAfter: 60
  }
});

/**
 * Rate limiter para autenticação
 * Limites baixos apenas para segurança
 */
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 tentativas por 5 minutos por IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `auth:${req.ip}`,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 5 minutos.',
    retryAfter: 300
  }
});

/**
 * Rate limiter para APIs críticas (settings, configurações)
 * Limites médios para proteger recursos importantes
 */
const settingsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // 200 requests por minuto por conta
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountKeyGenerator,
  message: {
    error: 'Muitas alterações de configuração. Aguarde um momento.',
    retryAfter: 60
  }
});

/**
 * Rate limiter global de segurança
 * Para prevenir ataques DDoS
 */
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100000, // 100k requests por minuto globalmente
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => 'global',
  message: {
    error: 'Sistema temporariamente sobrecarregado. Tente novamente em alguns minutos.',
    retryAfter: 60
  }
});

module.exports = {
  readApiLimiter,
  writeApiLimiter,
  dashboardLimiter,
  authLimiter,
  settingsLimiter,
  globalLimiter
};