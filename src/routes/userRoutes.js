const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticateToken, userController.list);
router.get('/me', authenticateToken, userController.me);
router.post('/', authenticateToken, userController.create);
router.put('/:id', authenticateToken, userController.update);
router.delete('/:id', authenticateToken, userController.remove);

module.exports = router;
