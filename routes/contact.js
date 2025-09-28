const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Public: submit contact message
router.post('/', contactController.create);

// Admin: list messages
router.get('/messages-get', authMiddleware, adminMiddleware, contactController.list);

router.put('/:id/status', authMiddleware, adminMiddleware, contactController.updateStatus);

module.exports = router;
