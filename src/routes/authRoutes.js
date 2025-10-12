const express = require('express');
const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/verify', authenticateToken, authController.verify);

// Recuperação de senha
router.post('/forgot-password', passwordResetController.forgotPassword);
router.post('/reset-password', passwordResetController.resetPassword);
router.post('/verify-otp', passwordResetController.verifyOTP);

module.exports = router;
