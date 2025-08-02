const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/image', authMiddleware, adminMiddleware, upload.single('image'), uploadController.uploadImage);
router.post('/images', authMiddleware, adminMiddleware, upload.array('images', 10), uploadController.uploadImages);

module.exports = router;