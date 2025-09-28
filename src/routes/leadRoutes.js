const express = require('express');
const leadController = require('../controllers/leadController');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateLead, validateUpdateLead } = require('../validators/leadValidator');
const { handleUuidFields } = require('../middleware/uuidHandler');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar leads
router.get('/', leadController.list);

// Buscar lead por telefone
router.get('/search/by-phone', leadController.getByPhone);

// Obter lead por ID
router.get('/:id', leadController.getById);

// Criar lead
router.post('/', handleUuidFields(['assigned_to_user_id', 'column_id']), validateCreateLead, leadController.create);

// Atualizar lead
router.put('/:id', handleUuidFields(['assigned_to_user_id', 'column_id']), validateUpdateLead, leadController.update);

// Deletar lead
router.delete('/:id', leadController.delete);

// Mover lead
router.patch('/:id/move', leadController.move);

// ===== OPTIMIZED ENDPOINTS FOR GRANULAR UPDATES =====
// These endpoints provide much better performance by updating only specific fields

// Atualizar apenas responsável (otimizado)
router.patch('/:id/assignee', leadController.updateAssignee);

// Atualizar apenas status (otimizado)
router.patch('/:id/status', leadController.updateStatus);

// Atualizar campo específico (otimizado)
router.patch('/:id/field', leadController.updateField);

// Atualização em batch com debounce (otimizado)
router.patch('/:id/batch', leadController.batchUpdate);

module.exports = router;
