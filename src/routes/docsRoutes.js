const express = require('express');
const path = require('path');

const router = express.Router();

/**
 * Rota pública para documentação da API
 * Não requer autenticação
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/docs/api-docs.html'));
});

module.exports = router;
