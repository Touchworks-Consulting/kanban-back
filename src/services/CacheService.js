/**
 * Serviço de Cache Redis para reduzir carga de requisições
 *
 * Estratégia:
 * - Cache de dados estáticos por longos períodos
 * - Cache de dashboard por períodos curtos
 * - Invalidação inteligente por eventos
 */

const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isEnabled = false; // Temporariamente desabilitado
    console.log('📦 Cache temporariamente desabilitado');

    // TODO: Re-habilitar após debug
    // this.isEnabled = process.env.REDIS_URL || process.env.REDIS_HOST;
    // if (this.isEnabled) {
    //   this.connect();
    // }
  }

  async connect() {
    try {
      const redisConfig = process.env.REDIS_URL ?
        { url: process.env.REDIS_URL } :
        {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        };

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isEnabled = false;
      });

      this.client.on('connect', () => {
        console.log('📦 Cache Redis conectado');
      });

      await this.client.connect();
    } catch (error) {
      console.error('Erro ao conectar Redis:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Gera chave de cache baseada em conta e recursos
   */
  generateKey(prefix, accountId, ...params) {
    return `${prefix}:${accountId}:${params.join(':')}`;
  }

  /**
   * Busca dados do cache
   */
  async get(key) {
    if (!this.isEnabled || !this.client) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache GET error:', error);
      return null;
    }
  }

  /**
   * Armazena dados no cache
   */
  async set(key, data, ttlSeconds = 300) {
    if (!this.isEnabled || !this.client) return false;

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache SET error:', error);
      return false;
    }
  }

  /**
   * Remove dados do cache
   */
  async del(key) {
    if (!this.isEnabled || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache DEL error:', error);
      return false;
    }
  }

  /**
   * Remove múltiplas chaves por padrão
   */
  async delPattern(pattern) {
    if (!this.isEnabled || !this.client) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache DEL PATTERN error:', error);
      return false;
    }
  }

  // === MÉTODOS ESPECÍFICOS PARA DADOS ESTÁTICOS ===

  /**
   * Cache de usuários da conta (dados que mudam raramente)
   */
  async getUsersCache(accountId) {
    const key = this.generateKey('users', accountId);
    return this.get(key);
  }

  async setUsersCache(accountId, users) {
    const key = this.generateKey('users', accountId);
    // Cache por 10 minutos - usuários mudam pouco
    return this.set(key, users, 600);
  }

  async invalidateUsersCache(accountId) {
    const key = this.generateKey('users', accountId);
    return this.del(key);
  }

  /**
   * Cache de campanhas (dados que mudam raramente)
   */
  async getCampaignsCache(accountId) {
    const key = this.generateKey('campaigns', accountId);
    return this.get(key);
  }

  async setCampaignsCache(accountId, campaigns) {
    const key = this.generateKey('campaigns', accountId);
    // Cache por 5 minutos - campanhas mudam ocasionalmente
    return this.set(key, campaigns, 300);
  }

  async invalidateCampaignsCache(accountId) {
    const key = this.generateKey('campaigns', accountId);
    return this.del(key);
  }

  /**
   * Cache de status customizados (dados que mudam muito raramente)
   */
  async getCustomStatusesCache(accountId) {
    const key = this.generateKey('custom_statuses', accountId);
    return this.get(key);
  }

  async setCustomStatusesCache(accountId, statuses) {
    const key = this.generateKey('custom_statuses', accountId);
    // Cache por 15 minutos - status customizados mudam muito raramente
    return this.set(key, statuses, 900);
  }

  async invalidateCustomStatusesCache(accountId) {
    const key = this.generateKey('custom_statuses', accountId);
    return this.del(key);
  }

  /**
   * Cache de motivos de perda (dados que mudam muito raramente)
   */
  async getLossReasonsCache(accountId) {
    const key = this.generateKey('loss_reasons', accountId);
    return this.get(key);
  }

  async setLossReasonsCache(accountId, reasons) {
    const key = this.generateKey('loss_reasons', accountId);
    // Cache por 15 minutos
    return this.set(key, reasons, 900);
  }

  async invalidateLossReasonsCache(accountId) {
    const key = this.generateKey('loss_reasons', accountId);
    return this.del(key);
  }

  /**
   * Cache de dados do dashboard (dados que mudam frequentemente mas podem ter cache curto)
   */
  async getDashboardCache(accountId, type, filters = '') {
    const key = this.generateKey('dashboard', accountId, type, filters);
    return this.get(key);
  }

  async setDashboardCache(accountId, type, data, filters = '') {
    const key = this.generateKey('dashboard', accountId, type, filters);
    // Cache curto - 30 segundos para dados de dashboard
    return this.set(key, data, 30);
  }

  async invalidateDashboardCache(accountId) {
    const pattern = this.generateKey('dashboard', accountId, '*');
    return this.delPattern(pattern);
  }

  /**
   * Invalidação em cascata quando lead é modificado
   */
  async invalidateLeadRelatedCaches(accountId) {
    console.log(`📦 Invalidando caches relacionados a leads para conta ${accountId}`);

    // Dashboard precisa ser atualizado quando leads mudam
    await this.invalidateDashboardCache(accountId);

    // Se campanhas são geradas dinamicamente dos leads, também invalidar
    // await this.invalidateCampaignsCache(accountId);
  }

  /**
   * Invalida todos os caches de uma conta
   */
  async invalidateAccountCache(accountId) {
    console.log(`📦 Invalidando todos os caches para conta ${accountId}`);

    const patterns = [
      `users:${accountId}:*`,
      `campaigns:${accountId}:*`,
      `custom_statuses:${accountId}:*`,
      `loss_reasons:${accountId}:*`,
      `dashboard:${accountId}:*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;