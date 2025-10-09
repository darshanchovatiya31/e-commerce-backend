const { body, validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

// Upload single image
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return responseHelper.error(res, 'No file uploaded', 400);
    }

    // With CloudinaryStorage, req.file.path contains the Cloudinary URL
    const imageUrl = req.file.path;

    responseHelper.success(res, { url: imageUrl }, 'Image uploaded successfully');
  } catch (error) {
    next(error);
  }
};

// Upload multiple images
exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return responseHelper.error(res, 'No files uploaded', 400);
    }

    // With CloudinaryStorage, req.files[].path contains the Cloudinary URLs
    const urls = req.files.map(file => file.path);

    responseHelper.success(res, { urls }, 'Images uploaded successfully');
  } catch (error) {
    next(error);
  }
};

// Upload category image specifically
exports.uploadCategoryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return responseHelper.error(res, 'No image file uploaded', 400);
    }

    // With CloudinaryStorage, req.file.path contains the Cloudinary URL
    const imageUrl = req.file.path;

    responseHelper.success(res, { url: imageUrl }, 'Category image uploaded successfully');
  } catch (error) {
    next(error);
  }
};