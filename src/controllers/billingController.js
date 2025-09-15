const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const UserSession = require('../models/UserSession');
const Account = require('../models/Account');
const { Op } = require('sequelize');

class BillingController {
  // Listar todos os planos disponíveis
  async getPlans(req, res) {
    try {
      // Durante beta, mostrar todos os planos incluindo inativos para exibição
      const plans = await Plan.findAll({
        order: [['sort_order', 'ASC'], ['price', 'ASC']]
      });

      return res.json({
        success: true,
        plans: plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          price: parseFloat(plan.price),
          max_users: plan.max_users,
          max_leads: plan.max_leads,
          features: plan.features,
          trial_days: plan.trial_days,
          is_default: plan.is_default
        }))
      });
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Obter assinatura atual da conta
  async getCurrentSubscription(req, res) {
    try {
      const { accountId } = req.user;

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

      if (!subscription) {
        return res.json({
          success: true,
          subscription: null,
          message: 'Nenhuma assinatura ativa encontrada'
        });
      }

      return res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          trial_start: subscription.trial_start,
          trial_end: subscription.trial_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          quantity: subscription.quantity,
          unit_price: parseFloat(subscription.unit_price),
          total_price: parseFloat(subscription.total_price),
          next_invoice_date: subscription.next_invoice_date,
          plan: subscription.plan
        }
      });
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Criar nova assinatura (durante beta, apenas simula)
  async createSubscription(req, res) {
    try {
      const { accountId } = req.user;
      const { plan_id, quantity = 1 } = req.body;

      // Verificar se o plano existe
      const plan = await Plan.findByPk(plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plano não encontrado'
        });
      }

      // Durante o beta, todas as assinaturas são gratuitas
      const isBeta = process.env.NODE_ENV !== 'production';

      if (isBeta) {
        // Cancelar assinatura anterior se existir
        await Subscription.update(
          {
            status: 'canceled',
            canceled_at: new Date(),
            cancel_at_period_end: false
          },
          {
            where: {
              account_id: accountId,
              status: { [Op.in]: ['trial', 'active'] }
            }
          }
        );

        // Criar nova assinatura beta (gratuita)
        const subscription = await Subscription.create({
          account_id: accountId,
          plan_id: plan_id,
          status: 'active', // Beta = sempre ativo
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
          quantity: quantity,
          unit_price: 0, // Gratuito durante beta
          total_price: 0,
          metadata: {
            beta_subscription: true,
            original_plan_price: parseFloat(plan.price)
          }
        });

        return res.json({
          success: true,
          subscription_id: subscription.id,
          message: 'Assinatura beta criada com sucesso!',
          beta_notice: 'Durante o período beta, todos os planos são gratuitos.'
        });
      }

      // Lógica de produção (Stripe integration)
      // TODO: Implementar integração com Stripe
      return res.json({
        success: false,
        error: 'Funcionalidade em desenvolvimento - aguarde o fim do período beta'
      });

    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar quantidade de usuários na assinatura
  async updateSubscriptionQuantity(req, res) {
    try {
      const { accountId } = req.user;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          error: 'Quantidade deve ser maior que zero'
        });
      }

      const subscription = await Subscription.findOne({
        where: {
          account_id: accountId,
          status: { [Op.in]: ['trial', 'active'] }
        }
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Nenhuma assinatura ativa encontrada'
        });
      }

      // Durante beta, permite mudança sem cobrança
      const isBeta = process.env.NODE_ENV !== 'production';

      if (isBeta) {
        await subscription.update({
          quantity: quantity,
          total_price: 0 // Gratuito durante beta
        });

        return res.json({
          success: true,
          message: 'Quantidade de usuários atualizada com sucesso!'
        });
      }

      // Lógica de produção (atualização Stripe)
      // TODO: Implementar atualização via Stripe
      return res.json({
        success: false,
        error: 'Funcionalidade em desenvolvimento - aguarde o fim do período beta'
      });

    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Cancelar assinatura
  async cancelSubscription(req, res) {
    try {
      const { accountId } = req.user;
      const { cancel_at_period_end = true } = req.body;

      const subscription = await Subscription.findOne({
        where: {
          account_id: accountId,
          status: { [Op.in]: ['trial', 'active'] }
        }
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Nenhuma assinatura ativa encontrada'
        });
      }

      // Durante beta, cancelamento imediato
      const isBeta = process.env.NODE_ENV !== 'production';

      if (isBeta) {
        await subscription.update({
          status: 'canceled',
          canceled_at: new Date(),
          cancel_at_period_end: false
        });

        return res.json({
          success: true,
          message: 'Assinatura cancelada com sucesso!'
        });
      }

      // Lógica de produção
      await subscription.update({
        cancel_at_period_end: cancel_at_period_end,
        canceled_at: cancel_at_period_end ? null : new Date()
      });

      return res.json({
        success: true,
        message: cancel_at_period_end
          ? 'Assinatura será cancelada no fim do período atual'
          : 'Assinatura cancelada imediatamente'
      });

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Webhook para eventos do Stripe (futuro)
  async handleStripeWebhook(req, res) {
    try {
      // TODO: Implementar webhook do Stripe
      console.log('Stripe webhook recebido:', req.body);

      return res.json({ received: true });
    } catch (error) {
      console.error('Erro no webhook Stripe:', error);
      return res.status(400).json({ error: 'Webhook error' });
    }
  }

  // Verificar limites da conta baseado no plano
  async checkAccountLimits(req, res) {
    try {
      const { accountId } = req.user;

      const subscription = await Subscription.findOne({
        where: {
          account_id: accountId,
          status: { [Op.in]: ['trial', 'active'] }
        },
        include: [{ model: Plan, as: 'plan' }]
      });

      if (!subscription) {
        return res.json({
          success: true,
          limits: {
            max_users: null, // Ilimitado se não há plano
            max_leads: null,
            current_users: 0,
            current_leads: 0
          }
        });
      }

      // TODO: Contar usuários e leads atuais da conta
      const currentUsers = 1; // Placeholder
      const currentLeads = 0; // Placeholder

      return res.json({
        success: true,
        limits: {
          max_users: subscription.plan.max_users,
          max_leads: subscription.plan.max_leads,
          current_users: currentUsers,
          current_leads: currentLeads,
          users_limit_reached: subscription.plan.max_users ? currentUsers >= subscription.plan.max_users : false,
          leads_limit_reached: subscription.plan.max_leads ? currentLeads >= subscription.plan.max_leads : false
        }
      });

    } catch (error) {
      console.error('Erro ao verificar limites:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new BillingController();