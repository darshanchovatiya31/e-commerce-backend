const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', categoryController.getCategories);
router.post('/', authMiddleware, adminMiddleware, categoryController.createCategory);
router.put('/:id', authMiddleware, adminMiddleware, categoryController.updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.deleteCategory);

module.exports = router;