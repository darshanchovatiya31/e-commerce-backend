const { body, param, validationResult } = require('express-validator');
const Category = require('../models/Category');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

exports.createCategory = [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('image').optional().isURL(),
  body('subcategories').optional().isArray(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, image, subcategories } = req.body;
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ error: 'Category name already exists' });
      }

      const category = new Category({ name, description, image, subcategories });
      await category.save();
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }
];

exports.updateCategory = [
  param('id').isMongoId(),
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('image').optional().isURL(),
  body('subcategories').optional().isArray(),
  body('isActive').optional().isBoolean(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, image, subcategories, isActive } = req.body;

      if (name) {
        const existingCategory = await Category.findOne({ name, _id: { $ne: id } });
        if (existingCategory) {
          return res.status(400).json({ error: 'Category name already exists' });
        }
      }

      const category = await Category.findByIdAndUpdate(
        id,
        { name, description, image, subcategories, isActive },
        { new: true, runValidators: true }
      );

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(category);
    } catch (error) {
      next(error);
    }
  }
];

exports.deleteCategory = [
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
];