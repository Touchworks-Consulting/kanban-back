const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.post('/broadcast',
  authenticateToken,
  [
    body('title').notEmpty().withMessage('Título é obrigatório'),
    body('message').notEmpty().withMessage('Mensagem é obrigatória'),
    body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Tipo inválido'),
    body('targetAccounts').optional().isArray().withMessage('Target accounts deve ser um array')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const { title, message, type = 'info', targetAccounts } = req.body;
      const io = req.app.get('io');

      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        timestamp: new Date(),
        read: false
      };

      // Enviar notificação via Socket.IO
      if (io) {
        if (targetAccounts && targetAccounts.length > 0) {
          targetAccounts.forEach(accountId => {
            io.to(`account-${accountId}`).emit('new-notification', notification);
          });
        } else {
          io.emit('new-notification', notification);
        }
        console.log(`Notificação enviada via Socket.IO: ${title}`);
      } else {
        console.error('Socket.IO não está disponível');
        return res.status(500).json({
          success: false,
          message: 'Serviço de notificação indisponível'
        });
      }

      res.json({
        success: true,
        message: 'Notificação processada com sucesso',
        notification,
        socketAvailable: !!io
      });
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
);

router.post('/test',
  authenticateToken,
  async (req, res) => {
    try {
      const io = req.app.get('io');
      const { accountId } = req.user;

      const testNotification = {
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        title: 'Notificação de Teste',
        message: 'Esta é uma notificação de teste do sistema de broadcasting em tempo real.',
        timestamp: new Date(),
        read: false
      };

      // Verifica se Socket.IO está disponível
      if (io) {
        io.to(`account-${accountId}`).emit('new-notification', testNotification);
        console.log(`📢 Notificação de teste enviada via Socket.IO para conta: ${accountId}`);
      } else {
        console.log(`📢 Notificação de teste criada (sem Socket.IO) para conta: ${accountId}`);
      }

      res.json({
        success: true,
        message: io ? 'Notificação de teste enviada via Socket.IO' : 'Notificação de teste criada (Socket.IO não disponível)',
        notification: testNotification,
        socketAvailable: !!io
      });
    } catch (error) {
      console.error('Erro ao processar notificação de teste:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
);

module.exports = router;