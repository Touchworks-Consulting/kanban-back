const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Account = require('../models/Account');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { Op } = require('sequelize');

class PlanLimitChecker {

  // Obter dados da assinatura atual com plano
  static async getCurrentSubscription(accountId) {
    try {
      const subscription = await Subscription.findOne({
        where: {
          account_id: accountId,
          status: { [Op.in]: ['trial', 'active'] }
        },
        include: [
          {
            model: Plan,
            as: 'plan'
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return subscription;
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      return null;
    }
  }

  // Contar usuários atuais da conta
  static async countCurrentUsers(accountId) {
    try {
      // Se existe tabela separada de usuários
      const User = require('../models/User');
      const userCount = await User.count({
        where: {
          account_id: accountId,
          is_active: true
        }
      });

      // Se não existir, contamos como 1 (owner da conta)
      return userCount || 1;
    } catch (error) {
      console.error('Erro ao contar usuários:', error);
      // Fallback: considera apenas o owner
      return 1;
    }
  }

  // Contar leads do mês atual
  static async countCurrentMonthLeads(accountId) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const leadCount = await Lead.count({
        where: {
          account_id: accountId,
          created_at: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        }
      });

      return leadCount;
    } catch (error) {
      console.error('Erro ao contar leads do mês:', error);
      return 0;
    }
  }

  // Verificar se pode adicionar usuários
  static async canAddUsers(accountId, quantityToAdd = 1) {
    try {
      const subscription = await this.getCurrentSubscription(accountId);

      // Durante beta ou sem plano = ilimitado
      if (!subscription || !subscription.plan || subscription.plan.max_users === null) {
        return {
          allowed: true,
          current: await this.countCurrentUsers(accountId),
          limit: null,
          remaining: null,
          message: 'Usuários ilimitados'
        };
      }

      const currentUsers = await this.countCurrentUsers(accountId);
      const maxUsers = subscription.plan.max_users;
      const newTotal = currentUsers + quantityToAdd;

      return {
        allowed: newTotal <= maxUsers,
        current: currentUsers,
        limit: maxUsers,
        remaining: maxUsers - currentUsers,
        message: newTotal > maxUsers
          ? `Limite de ${maxUsers} usuários atingido. Considere fazer upgrade do plano.`
          : `${maxUsers - newTotal} usuários restantes no plano.`
      };

    } catch (error) {
      console.error('Erro ao verificar limite de usuários:', error);
      return {
        allowed: false,
        error: 'Erro ao verificar limite'
      };
    }
  }

  // Verificar se pode adicionar leads
  static async canAddLeads(accountId, quantityToAdd = 1) {
    try {
      const subscription = await this.getCurrentSubscription(accountId);

      // Durante beta ou sem plano = ilimitado
      if (!subscription || !subscription.plan || subscription.plan.max_leads === null) {
        return {
          allowed: true,
          current: await this.countCurrentMonthLeads(accountId),
          limit: null,
          remaining: null,
          message: 'Leads ilimitados'
        };
      }

      const currentLeads = await this.countCurrentMonthLeads(accountId);
      const maxLeads = subscription.plan.max_leads;
      const newTotal = currentLeads + quantityToAdd;

      return {
        allowed: newTotal <= maxLeads,
        current: currentLeads,
        limit: maxLeads,
        remaining: maxLeads - currentLeads,
        message: newTotal > maxLeads
          ? `Limite de ${maxLeads} leads mensais atingido. Considere fazer upgrade do plano.`
          : `${maxLeads - newTotal} leads restantes neste mês.`
      };

    } catch (error) {
      console.error('Erro ao verificar limite de leads:', error);
      return {
        allowed: false,
        error: 'Erro ao verificar limite'
      };
    }
  }

  // Middleware para validar antes de criar usuário
  static checkUserLimit() {
    return async (req, res, next) => {
      try {
        const { accountId } = req.user;
        const quantityToAdd = req.body.quantity || 1;

        const limitCheck = await this.canAddUsers(accountId, quantityToAdd);

        if (!limitCheck.allowed) {
          return res.status(403).json({
            success: false,
            error: limitCheck.message || 'Limite de usuários atingido',
            code: 'USER_LIMIT_EXCEEDED',
            limits: {
              current: limitCheck.current,
              limit: limitCheck.limit,
              remaining: limitCheck.remaining
            },
            upgrade_required: true
          });
        }

        // Adiciona informações de limite ao request para uso posterior
        req.planLimits = req.planLimits || {};
        req.planLimits.users = limitCheck;

        next();

      } catch (error) {
        console.error('Erro no middleware de limite de usuários:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    };
  }

  // Middleware para validar antes de criar lead
  static checkLeadLimit() {
    return async (req, res, next) => {
      try {
        const { accountId } = req.user;
        const quantityToAdd = req.body.quantity || 1;

        const limitCheck = await this.canAddLeads(accountId, quantityToAdd);

        if (!limitCheck.allowed) {
          return res.status(403).json({
            success: false,
            error: limitCheck.message || 'Limite de leads mensais atingido',
            code: 'LEAD_LIMIT_EXCEEDED',
            limits: {
              current: limitCheck.current,
              limit: limitCheck.limit,
              remaining: limitCheck.remaining
            },
            upgrade_required: true
          });
        }

        // Adiciona informações de limite ao request
        req.planLimits = req.planLimits || {};
        req.planLimits.leads = limitCheck;

        next();

      } catch (error) {
        console.error('Erro no middleware de limite de leads:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    };
  }

  // Middleware para obter informações completas dos limites
  static getLimitsInfo() {
    return async (req, res, next) => {
      try {
        const { accountId } = req.user;

        const [userLimits, leadLimits] = await Promise.all([
          this.canAddUsers(accountId, 0),
          this.canAddLeads(accountId, 0)
        ]);

        const subscription = await this.getCurrentSubscription(accountId);

        req.planLimits = {
          users: userLimits,
          leads: leadLimits,
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status,
            plan_name: subscription.plan?.name,
            expires_at: subscription.current_period_end
          } : null
        };

        next();

      } catch (error) {
        console.error('Erro ao obter informações de limite:', error);
        req.planLimits = {
          users: { allowed: true, error: 'Erro ao verificar limites' },
          leads: { allowed: true, error: 'Erro ao verificar limites' },
          subscription: null
        };
        next();
      }
    };
  }

  // Verificar se uma feature está disponível no plano
  static checkFeatureAccess(featureName) {
    return async (req, res, next) => {
      try {
        const { accountId } = req.user;
        const subscription = await this.getCurrentSubscription(accountId);

        // Durante beta = todas as features liberadas
        if (!subscription || !subscription.plan) {
          req.featureAccess = { allowed: true, reason: 'beta_period' };
          return next();
        }

        const planFeatures = subscription.plan.features || [];
        const hasFeature = planFeatures.some(feature =>
          feature.name === featureName || feature.slug === featureName
        );

        if (!hasFeature) {
          return res.status(403).json({
            success: false,
            error: `Feature "${featureName}" não disponível no seu plano atual`,
            code: 'FEATURE_NOT_AVAILABLE',
            upgrade_required: true,
            current_plan: subscription.plan.name
          });
        }

        req.featureAccess = { allowed: true, reason: 'plan_includes' };
        next();

      } catch (error) {
        console.error('Erro ao verificar acesso à feature:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    };
  }

  // Endpoint para verificar status dos limites (para frontend)
  static async getLimitsStatus(req, res) {
    try {
      const { accountId } = req.user;

      const [userLimits, leadLimits] = await Promise.all([
        this.canAddUsers(accountId, 0),
        this.canAddLeads(accountId, 0)
      ]);

      const subscription = await this.getCurrentSubscription(accountId);

      return res.json({
        success: true,
        limits: {
          users: {
            current: userLimits.current,
            limit: userLimits.limit,
            remaining: userLimits.remaining,
            percentage: userLimits.limit
              ? Math.round((userLimits.current / userLimits.limit) * 100)
              : 0
          },
          leads: {
            current: leadLimits.current,
            limit: leadLimits.limit,
            remaining: leadLimits.remaining,
            percentage: leadLimits.limit
              ? Math.round((leadLimits.current / leadLimits.limit) * 100)
              : 0
          }
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          plan_name: subscription.plan?.name || 'Beta',
          plan_price: subscription.plan?.price || 0,
          expires_at: subscription.current_period_end,
          is_beta: !subscription.plan || subscription.plan.price == 0
        } : {
          plan_name: 'Beta',
          is_beta: true
        },
        warnings: {
          users_near_limit: userLimits.limit && userLimits.remaining <= 2,
          leads_near_limit: leadLimits.limit && leadLimits.remaining <= 100
        }
      });

    } catch (error) {
      console.error('Erro ao buscar status dos limites:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = PlanLimitChecker;