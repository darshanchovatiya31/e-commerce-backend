const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const categoryUpload = require('../utils/categoryUpload');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, categoryUpload.single('image'), categoryController.createCategory);
router.put('/:id', authMiddleware, adminMiddleware, categoryUpload.single('image'), categoryController.updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.deleteCategory);

module.exports = router;