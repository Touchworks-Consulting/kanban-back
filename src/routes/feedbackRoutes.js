const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Feedback, User, Account } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const requestIp = require('request-ip');

// Código de acesso especial para admin (você pode mudar este valor)
const ADMIN_ACCESS_CODE = 'TOUCHRUN_BETA_ADMIN_2024';

// Middleware para capturar IP
router.use(requestIp.mw());

// Rota para enviar feedback (usuários autenticados)
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { type, message, browser_info, screen_resolution, current_page } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'Tipo e mensagem são obrigatórios' });
    }

    // Capturar informações automáticas
    const userAgent = req.get('User-Agent');
    const ipAddress = req.clientIp;

    // Informações do usuário autenticado
    const user = req.user;

    // Criar feedback no banco
    const feedback = await Feedback.create({
      type,
      message,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      account_id: user.account_id,
      account_name: user.account?.display_name || 'N/A',
      user_agent: userAgent,
      ip_address: ipAddress,
      screen_resolution,
      browser_info,
      current_page,
      status: 'new',
      priority: type === 'bug' ? 'high' : 'medium'
    });

    console.log('📝 Novo feedback recebido:', {
      id: feedback.id,
      type: feedback.type,
      user: feedback.user_name,
      account: feedback.account_name,
      created_at: feedback.created_at
    });

    res.json({
      success: true,
      message: 'Feedback enviado com sucesso!',
      feedback_id: feedback.id
    });
  } catch (error) {
    console.error('Erro ao salvar feedback:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para verificar código de acesso admin
router.post('/admin/verify-code', (req, res) => {
  const { access_code } = req.body;

  if (access_code === ADMIN_ACCESS_CODE) {
    res.json({
      success: true,
      message: 'Código válido',
      token: Buffer.from(ADMIN_ACCESS_CODE).toString('base64')
    });
  } else {
    res.status(401).json({ error: 'Código de acesso inválido' });
  }
});

// Middleware para verificar token de admin
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    if (decoded === ADMIN_ACCESS_CODE) {
      next();
    } else {
      res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Rotas administrativas
router.get('/admin/list', verifyAdminToken, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const offset = (page - 1) * limit;

    const feedbacks = await Feedback.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'display_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      feedbacks: feedbacks.rows,
      total: feedbacks.count,
      page: parseInt(page),
      pages: Math.ceil(feedbacks.count / limit)
    });
  } catch (error) {
    console.error('Erro ao listar feedbacks:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status/prioridade do feedback
router.patch('/admin/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, admin_notes } = req.body;

    const feedback = await Feedback.findByPk(id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback não encontrado' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    await feedback.update(updates);

    res.json({ success: true, message: 'Feedback atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas do feedback
router.get('/admin/stats', verifyAdminToken, async (req, res) => {
  try {
    const [
      totalFeedbacks,
      byType,
      byStatus,
      recentCount
    ] = await Promise.all([
      Feedback.count(),
      Feedback.findAll({
        attributes: [
          'type',
          [Feedback.sequelize.fn('COUNT', Feedback.sequelize.col('id')), 'count']
        ],
        group: ['type']
      }),
      Feedback.findAll({
        attributes: [
          'status',
          [Feedback.sequelize.fn('COUNT', Feedback.sequelize.col('id')), 'count']
        ],
        group: ['status']
      }),
      Feedback.count({
        where: {
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // últimos 7 dias
          }
        }
      })
    ]);

    res.json({
      total: totalFeedbacks,
      by_type: byType,
      by_status: byStatus,
      recent_week: recentCount
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;