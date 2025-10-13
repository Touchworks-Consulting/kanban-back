const express = require('express');
const kanbanController = require('../controllers/kanbanController');
const { authenticateFlexible } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação (JWT ou API key para embed)
router.use(authenticateFlexible);

// Obter board completo
router.get('/board', kanbanController.getBoard);

// Colunas
router.get('/columns', kanbanController.listColumns);
router.post('/columns', kanbanController.createColumn);
router.put('/columns/:id', kanbanController.updateColumn);
router.delete('/columns/:id', kanbanController.deleteColumn);
router.patch('/columns/reorder', kanbanController.reorderColumns);

module.exports = router;
