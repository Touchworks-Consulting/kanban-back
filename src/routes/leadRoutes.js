const express = require('express');
const leadController = require('../controllers/leadController');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateLead, validateUpdateLead } = require('../validators/leadValidator');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar leads
router.get('/', leadController.list);

// Obter lead por ID
router.get('/:id', leadController.getById);

// Criar lead
router.post('/', validateCreateLead, leadController.create);

// Atualizar lead
router.put('/:id', validateUpdateLead, leadController.update);

// Deletar lead
router.delete('/:id', leadController.delete);

// Mover lead
router.patch('/:id/move', leadController.move);

module.exports = router;
