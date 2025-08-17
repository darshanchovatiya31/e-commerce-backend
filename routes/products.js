const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Admin routes (require authentication and admin role) - Must be before /:id route
router.get('/admin/all', authMiddleware, adminMiddleware, productController.getAllProductsAdmin);
router.post('/', authMiddleware, adminMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, adminMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);
router.patch('/:id/toggle-status', authMiddleware, adminMiddleware, productController.toggleProductStatus);
router.patch('/:id/toggle-featured', authMiddleware, adminMiddleware, productController.toggleFeatured);

// Public routes
router.get('/', productController.getProducts);
router.get('/shop-products', productController.getProductsForShop); // New endpoint for shop page
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/search', productController.searchProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/:id', productController.getProduct); // Must be last

module.exports = router;