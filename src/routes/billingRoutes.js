const express = require('express');
const billingController = require('../controllers/billingController');
const PlanLimitChecker = require('../middleware/planLimitChecker');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Rotas de planos
router.get('/plans', billingController.getPlans.bind(billingController));

// Rotas de assinatura
router.get('/subscription', billingController.getCurrentSubscription.bind(billingController));
router.post('/subscription', billingController.createSubscription.bind(billingController));
router.put('/subscription/quantity', billingController.updateSubscriptionQuantity.bind(billingController));
router.post('/subscription/cancel', billingController.cancelSubscription.bind(billingController));

// Rotas de verificação de limites
router.get('/limits/status', PlanLimitChecker.getLimitsStatus);
router.get('/limits/info', PlanLimitChecker.getLimitsInfo(), (req, res) => {
  return res.json({
    success: true,
    limits: req.planLimits
  });
});

// Endpoints para validação antes de ações (para uso do frontend)
router.post('/limits/check-users', async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const { accountId } = req.user;

    const limitCheck = await PlanLimitChecker.canAddUsers(accountId, quantity);

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

    return res.json({
      success: true,
      message: 'Limite OK',
      limits: limitCheck
    });

  } catch (error) {
    console.error('Erro ao verificar limite de usuários:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

router.post('/limits/check-leads', async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const { accountId } = req.user;

    const limitCheck = await PlanLimitChecker.canAddLeads(accountId, quantity);

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

    return res.json({
      success: true,
      message: 'Limite OK',
      limits: limitCheck
    });

  } catch (error) {
    console.error('Erro ao verificar limite de leads:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Webhook do Stripe (sem autenticação - usar validação de signature)
router.post('/webhook/stripe', billingController.handleStripeWebhook.bind(billingController));

module.exports = router;