const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserAccounts,
  switchAccount,
  createAccount,
  updateAccount,
  getCurrentAccount
} = require('../controllers/accountController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /api/accounts - Listar todas as contas do usuário
router.get('/', getUserAccounts);

// GET /api/accounts/current - Obter conta atual
router.get('/current', getCurrentAccount);

// POST /api/accounts - Criar nova conta
router.post('/', createAccount);

// PUT /api/accounts/:accountId - Atualizar conta
router.put('/:accountId', updateAccount);

// POST /api/accounts/switch - Trocar contexto de conta
router.post('/switch', switchAccount);

module.exports = router;