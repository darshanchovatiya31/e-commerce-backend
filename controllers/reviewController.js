const { body, param, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');

exports.getProductReviews = [
  param('productId').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reviews = await Review.find({ productId: req.params.productId }).populate('userId', 'firstName lastName');
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  }
];

exports.addReview = [
  param('productId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId } = req.params;
      const { rating, comment } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const existingReview = await Review.findOne({ productId, userId: req.user._id });
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }

      const review = new Review({
        productId,
        userId: req.user._id,
        rating,
        comment,
        isVerified: false // Set to true if user has purchased the product (requires order check)
      });

      await review.save();

      // Update product rating and review count
      const reviews = await Review.find({ productId });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      product.rating = avgRating;
      product.reviewCount = reviews.length;
      await product.save();

      res.status(201).json(review);
    } catch (error) {
      next(error);
    }
  }
];

exports.updateReview = [
  param('id').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rating, comment } = req.body;
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      if (review.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      review.rating = rating;
      review.comment = comment;
      await review.save();

      // Update product rating
      const reviews = await Review.find({ productId: review.productId });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Product.findByIdAndUpdate(review.productId, { rating: avgRating, reviewCount: reviews.length });

      res.json(review);
    } catch (error) {
      next(error);
    }
  }
];

exports.deleteReview = [
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      if (review.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await review.deleteOne();

      // Update product rating
      const reviews = await Review.find({ productId: review.productId });
      const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      await Product.findByIdAndUpdate(review.productId, { rating: avgRating, reviewCount: reviews.length });

      res.json({ message: 'Review deleted' });
    } catch (error) {
      next(error);
    }
  }
];