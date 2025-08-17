const cloudinary = require('cloudinary').v2;
const { body, validationResult } = require('express-validator');
const fs = require('fs/promises');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'samjubaa',
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    });

    // Clean up temp file
    await fs.unlink(req.file.path).catch(() => {});

    res.json({ url: result.secure_url });
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(file =>
      cloudinary.uploader.upload(file.path, {
        folder: 'samjubaa',
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
      })
    );

    const results = await Promise.all(uploadPromises);
    const urls = results.map(result => result.secure_url);

    // Clean up temp files
    await Promise.all(req.files.map(f => fs.unlink(f.path).catch(() => {})));

    res.json({ urls });
  } catch (error) {
    next(error);
  }
};