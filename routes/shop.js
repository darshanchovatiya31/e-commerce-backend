const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Shop-specific routes
router.get('/products', productController.getProductsForShop);

module.exports = router;