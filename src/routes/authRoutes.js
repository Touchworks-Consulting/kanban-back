const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', authController.login);

// Verificar token
router.get('/verify', authenticateToken, authController.verify);

module.exports = router;
