const express = require('express');
const embedController = require('../controllers/embedController');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Handler explícito para OPTIONS (preflight) - ANTES da autenticação
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Tenant-ID, x-api-key');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Todas as rotas de embed requerem autenticação via API key
router.use(authenticateApiKey);

/**
 * Buscar lead por telefone
 * GET /api/embed/lead/by-phone?phone=5511999999999
 *
 * Headers necessários:
 * - x-api-key: API key da conta
 *
 * Response:
 * {
 *   id: "uuid",
 *   name: "Nome do Lead",
 *   phone: "5511999999999",
 *   email: "lead@example.com",
 *   status: "active",
 *   column: { id, name, color },
 *   tags: [...],
 *   assignedUser: { id, name, email }
 * }
 */
router.get('/lead/by-phone', embedController.getLeadByPhone);

/**
 * Buscar lead por ID (para validação no iframe)
 * GET /api/embed/lead-modal/:leadId
 *
 * Headers necessários:
 * - x-api-key: API key da conta
 *
 * Response: Mesma estrutura do endpoint acima
 */
router.get('/lead-modal/:leadId', embedController.getLeadById);

module.exports = router;
