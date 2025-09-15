const express = require('express');
const cronJobController = require('../controllers/cronJobController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar cron jobs
router.get('/', cronJobController.list);

// Obter tipos disponíveis
router.get('/types', cronJobController.getTypes);

// Obter cron job específico
router.get('/:id', cronJobController.getById);

// Criar cron job
router.post('/', cronJobController.create);

// Atualizar cron job
router.put('/:id', cronJobController.update);

// Deletar cron job
router.delete('/:id', cronJobController.delete);

// Ativar/desativar cron job
router.patch('/:id/toggle', cronJobController.toggle);

// Executar cron job manualmente
router.post('/:id/execute', cronJobController.execute);

// Obter execuções de um cron job
router.get('/:id/executions', cronJobController.getExecutions);

module.exports = router;
