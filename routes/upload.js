const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const categoryUpload = require('../utils/categoryUpload');

// Upload category image
router.post('/category-image', authMiddleware, adminMiddleware, categoryUpload.single('image'), uploadController.uploadCategoryImage);

// Upload single image (general)
router.post('/image', authMiddleware, adminMiddleware, categoryUpload.single('image'), uploadController.uploadImage);

// Upload multiple images
router.post('/images', authMiddleware, adminMiddleware, categoryUpload.array('images', 10), uploadController.uploadImages);

module.exports = router;