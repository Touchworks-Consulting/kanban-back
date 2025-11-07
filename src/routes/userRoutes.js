const express = require('express');
const { authenticateFlexible } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticateFlexible, userController.list);
router.get('/me', authenticateFlexible, userController.me);
router.post('/', authenticateFlexible, userController.create);
router.post('/request-phone-verification', authenticateFlexible, userController.requestPhoneVerification);
router.put('/verify-phone', authenticateFlexible, userController.verifyPhone);
router.put('/:id', authenticateFlexible, userController.update);
router.put('/:id/reset-password', authenticateFlexible, userController.resetPassword);
router.patch('/:id/role', authenticateFlexible, userController.changeUserRole);
router.delete('/:id', authenticateFlexible, userController.remove);

module.exports = router;
