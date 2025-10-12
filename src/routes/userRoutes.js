const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticateToken, userController.list);
router.get('/me', authenticateToken, userController.me);
router.post('/', authenticateToken, userController.create);
router.post('/request-phone-verification', authenticateToken, userController.requestPhoneVerification);
router.put('/verify-phone', authenticateToken, userController.verifyPhone);
router.put('/:id', authenticateToken, userController.update);
router.put('/:id/reset-password', authenticateToken, userController.resetPassword);
router.delete('/:id', authenticateToken, userController.remove);

module.exports = router;
