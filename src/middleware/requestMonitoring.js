/**
 * Middleware de monitoramento de requisições e rate limiting
 * Coleta métricas para otimização de performance
 */

const fs = require('fs').promises;
const path = require('path');

class RequestMonitor {
  constructor() {
    this.metrics = new Map();
    this.rateLimitHits = new Map();
    this.logFile = path.join(process.cwd(), 'rate-limit-analytics.log');

    // Reset métricas a cada hora
    setInterval(() => {
      this.resetMetrics();
    }, 60 * 60 * 1000); // 1 hora
  }

  /**
   * Middleware principal de monitoramento
   */
  monitor() {
    return (req, res, next) => {
      const startTime = Date.now();
      const userKey = this.getUserKey(req);
      const endpoint = `${req.method} ${req.route?.path || req.path}`;

      // Capturar resposta original
      const originalSend = res.send;
      res.send = function(data) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = res.statusCode;

        // Registrar métricas
        monitor.recordRequest(userKey, endpoint, duration, statusCode, req);

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Middleware específico para rate limiting
   */
  rateLimitMonitor() {
    return (req, res, next) => {
      const userKey = this.getUserKey(req);
      const endpoint = `${req.method} ${req.route?.path || req.path}`;

      // Hook no rate limiter para capturar hits
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 429) {
          monitor.recordRateLimitHit(userKey, endpoint, req);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  getUserKey(req) {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    if (req.account && req.account.id) {
      return `account:${req.account.id}`;
    }
    return `ip:${req.ip}`;
  }

  recordRequest(userKey, endpoint, duration, statusCode, req) {
    const key = `${userKey}:${endpoint}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        userKey,
        endpoint,
        count: 0,
        totalDuration: 0,
        statusCodes: new Map(),
        timestamps: []
      });
    }

    const metric = this.metrics.get(key);
    metric.count++;
    metric.totalDuration += duration;

    const statusKey = statusCode.toString();
    metric.statusCodes.set(statusKey, (metric.statusCodes.get(statusKey) || 0) + 1);

    // Manter apenas os últimos 100 timestamps para análise
    metric.timestamps.push(Date.now());
    if (metric.timestamps.length > 100) {
      metric.timestamps.shift();
    }

    // Log de requisições suspeitas (muitas requisições em pouco tempo)
    if (metric.timestamps.length >= 10) {
      const recentRequests = metric.timestamps.slice(-10);
      const timeSpan = recentRequests[recentRequests.length - 1] - recentRequests[0];

      if (timeSpan < 10000) { // 10 requests em menos de 10 segundos
        console.warn(`⚠️  Alto volume: ${userKey} fez ${recentRequests.length} requests em ${timeSpan}ms para ${endpoint}`);
      }
    }
  }

  recordRateLimitHit(userKey, endpoint, req) {
    const key = `${userKey}:${endpoint}`;

    if (!this.rateLimitHits.has(key)) {
      this.rateLimitHits.set(key, {
        userKey,
        endpoint,
        hits: 0,
        firstHit: Date.now(),
        lastHit: Date.now()
      });
    }

    const hit = this.rateLimitHits.get(key);
    hit.hits++;
    hit.lastHit = Date.now();

    console.warn(`🚫 Rate limit hit: ${userKey} em ${endpoint} (${hit.hits}x hits)`);

    // Log crítico para análise
    this.logRateLimitHit(userKey, endpoint, hit.hits, req);
  }

  async logRateLimitHit(userKey, endpoint, hitCount, req) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userKey,
      endpoint,
      hitCount,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: {
        'x-forwarded-for': req.get('x-forwarded-for'),
        'x-real-ip': req.get('x-real-ip')
      }
    };

    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Erro ao escrever log de rate limit:', error);
    }
  }

  /**
   * Gera relatório de métricas
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRequests: 0,
      topEndpoints: [],
      topUsers: [],
      rateLimitSummary: {},
      performance: {}
    };

    // Agregar dados
    const endpointStats = new Map();
    const userStats = new Map();

    for (const [key, metric] of this.metrics) {
      report.totalRequests += metric.count;

      // Stats por endpoint
      if (!endpointStats.has(metric.endpoint)) {
        endpointStats.set(metric.endpoint, {
          endpoint: metric.endpoint,
          requests: 0,
          avgDuration: 0,
          totalDuration: 0
        });
      }
      const endpointStat = endpointStats.get(metric.endpoint);
      endpointStat.requests += metric.count;
      endpointStat.totalDuration += metric.totalDuration;
      endpointStat.avgDuration = endpointStat.totalDuration / endpointStat.requests;

      // Stats por usuário
      if (!userStats.has(metric.userKey)) {
        userStats.set(metric.userKey, {
          userKey: metric.userKey,
          requests: 0
        });
      }
      userStats.get(metric.userKey).requests += metric.count;
    }

    // Top 10 endpoints
    report.topEndpoints = Array.from(endpointStats.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Top 10 usuários
    report.topUsers = Array.from(userStats.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Rate limit summary
    report.rateLimitSummary = {
      totalHits: Array.from(this.rateLimitHits.values()).reduce((sum, hit) => sum + hit.hits, 0),
      uniqueUsers: this.rateLimitHits.size,
      topOffenders: Array.from(this.rateLimitHits.values())
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 5)
        .map(hit => ({
          userKey: hit.userKey,
          endpoint: hit.endpoint,
          hits: hit.hits
        }))
    };

    return report;
  }

  resetMetrics() {
    console.log(`📊 Resetando métricas: ${this.metrics.size} entries, ${this.rateLimitHits.size} rate limit hits`);
    this.metrics.clear();
    this.rateLimitHits.clear();
  }

  /**
   * Endpoint para obter métricas
   */
  getMetrics(req, res) {
    const report = monitor.generateReport();
    res.json({
      success: true,
      report
    });
  }
}

// Singleton instance
const monitor = new RequestMonitor();

module.exports = {
  monitor: monitor.monitor.bind(monitor),
  rateLimitMonitor: monitor.rateLimitMonitor.bind(monitor),
  getMetrics: monitor.getMetrics.bind(monitor),
  RequestMonitor
};