const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Pusher Beams para produção (notificações push nativas)
let beamsClient = null;
if (process.env.NODE_ENV === 'production' && process.env.PUSHER_INSTANCE_ID) {
  const PushNotifications = require('@pusher/push-notifications-server');
  beamsClient = new PushNotifications({
    instanceId: process.env.PUSHER_INSTANCE_ID,
    secretKey: process.env.PUSHER_SECRET_KEY,
  });
}

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

      // Enviar notificação via Socket.IO (local) ou Pusher Beams (produção)
      if (io) {
        // Ambiente local com Socket.IO
        if (targetAccounts && targetAccounts.length > 0) {
          targetAccounts.forEach(accountId => {
            io.to(`account-${accountId}`).emit('new-notification', notification);
          });
        } else {
          io.emit('new-notification', notification);
        }
        console.log(`📢 Notificação enviada via Socket.IO: ${title}`);
      } else if (beamsClient) {
        // Ambiente de produção com Pusher Beams (notificações push nativas)
        try {
          const pushPayload = {
            web: {
              notification: {
                title: notification.title,
                body: notification.message,
                icon: '/icon-192x192.png', // Você pode ajustar o ícone
                badge: '/badge-72x72.png', // Badge opcional
                data: {
                  id: notification.id,
                  type: notification.type,
                  timestamp: notification.timestamp
                }
              }
            }
          };

          if (targetAccounts && targetAccounts.length > 0) {
            // Enviar para contas específicas
            for (const accountId of targetAccounts) {
              await beamsClient.publishToInterests([`account-${accountId}`], pushPayload);
            }
          } else {
            // Enviar para todos (interesse global)
            await beamsClient.publishToInterests(['global-notifications'], pushPayload);
          }

          console.log(`📢 Notificação push enviada via Pusher Beams: ${title}`);
        } catch (error) {
          console.error('Erro ao enviar push notification:', error);
        }
      } else {
        console.log(`⚠️ Nenhum serviço de notificação disponível: ${title}`);
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