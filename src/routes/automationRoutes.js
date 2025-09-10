const express = require('express');
const automationController = require('../controllers/automationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar automações
router.get('/', automationController.list);

// Obter tipos de triggers
router.get('/trigger-types', automationController.getTriggerTypes);

// Obter tipos de ações
router.get('/action-types', automationController.getActionTypes);

// Obter recursos (colunas, tags, etc.)
router.get('/resources', automationController.getResources);

// Obter automação específica
router.get('/:id', automationController.getById);

// Criar automação
router.post('/', automationController.create);

// Atualizar automação
router.put('/:id', automationController.update);

// Deletar automação
router.delete('/:id', automationController.delete);

// Ativar/desativar automação
router.patch('/:id/toggle', automationController.toggle);

// Executar automação manualmente
router.post('/:id/execute', automationController.execute);

// Obter execuções de uma automação
router.get('/:id/executions', automationController.getExecutions);

module.exports = router;
