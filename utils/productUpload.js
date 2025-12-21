const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { compressImage, getOptimalCompressionConfig } = require("./imageCompression");

/**
 * Custom Multer Storage Engine with Image Compression
 * Compresses images before uploading to Cloudinary
 */
class CompressedCloudinaryStorage {
  constructor(options) {
    this.cloudinary = options.cloudinary;
    this.params = options.params || {};
  }

  /**
   * Handle file upload with compression
   */
  _handleFile(req, file, cb) {
    const chunks = [];
    let totalSize = 0;

    // Collect file buffer from stream
    file.stream.on('data', (chunk) => {
      chunks.push(chunk);
      totalSize += chunk.length;
    });

    file.stream.on('end', async () => {
      try {
        const originalBuffer = Buffer.concat(chunks);
        
        // Get optimal compression settings based on file size
        const compressionConfig = getOptimalCompressionConfig(totalSize);
        
        // Compress the image
        const compressedBuffer = await compressImage(originalBuffer, compressionConfig);
        
        // Prepare upload options for Cloudinary
        const uploadOptions = {
          folder: this.params.folder || "ecommerce-products",
          allowed_formats: this.params.allowed_formats || ["jpg", "jpeg", "png", "webp"],
          resource_type: "image",
          // Apply transformations if specified
          ...(this.params.transformation && { transformation: this.params.transformation }),
        };

        // Upload compressed image to Cloudinary
        const uploadStream = this.cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return cb(error);
            }
            
            // Return file info in the format multer expects
            // This matches the format from multer-storage-cloudinary
            cb(null, {
              fieldname: file.fieldname,
              originalname: file.originalname,
              encoding: file.encoding,
              mimetype: file.mimetype,
              size: compressedBuffer.length,
              path: result.secure_url, // Cloudinary URL (for compatibility)
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
              original_size: totalSize, // Store original size for reference
              compressed_size: compressedBuffer.length,
              compression_ratio: ((1 - compressedBuffer.length / totalSize) * 100).toFixed(2),
            });
          }
        );

        // Send compressed buffer to Cloudinary
        uploadStream.end(compressedBuffer);
        
      } catch (error) {
        console.error('Image processing error:', error);
        
        // If compression fails, try uploading original as fallback
        try {
          const originalBuffer = Buffer.concat(chunks);
          
          const uploadStream = this.cloudinary.uploader.upload_stream(
            {
              folder: this.params.folder || "ecommerce-products",
              allowed_formats: this.params.allowed_formats || ["jpg", "jpeg", "png", "webp"],
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                return cb(error);
              }
              
              cb(null, {
                fieldname: file.fieldname,
                originalname: file.originalname,
                encoding: file.encoding,
                mimetype: file.mimetype,
                size: originalBuffer.length,
                path: result.secure_url,
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
              });
            }
          );
          
          uploadStream.end(originalBuffer);
        } catch (fallbackError) {
          cb(fallbackError);
        }
      }
    });

    file.stream.on('error', (error) => {
      cb(error);
    });
  }

  /**
   * Remove file from Cloudinary (optional cleanup)
   */
  _removeFile(req, file, cb) {
    if (file.public_id) {
      this.cloudinary.uploader.destroy(file.public_id, (error) => {
        if (error) {
          console.error('Error removing file from Cloudinary:', error);
        }
        cb(error);
      });
    } else {
      cb(null);
    }
  }
}

// Create storage with compression
const storage = new CompressedCloudinaryStorage({
  cloudinary,
  params: {
    folder: "ecommerce-products", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // Additional Cloudinary transformations (optional)
    // Compression is handled by our utility, but we can add more transformations here
    transformation: [
      { 
        quality: "auto", // Cloudinary's automatic quality optimization
        fetch_format: "auto" // Auto format (WebP if supported by browser)
      }
    ],
  },
});

// Configure multer with compressed storage
const productUpload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file (before compression)
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

module.exports = productUpload;
