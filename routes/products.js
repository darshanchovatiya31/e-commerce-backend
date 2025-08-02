const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.post('/', authMiddleware, adminMiddleware, productController.createProduct);
// Add updateProduct, deleteProduct, getFeaturedProducts, getNewArrivals, searchProducts routes

module.exports = router;