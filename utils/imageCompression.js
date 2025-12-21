const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image compression configuration
 * Adjust these values based on your requirements
 */
const COMPRESSION_CONFIG = {
  // Maximum width for product images
  maxWidth: 1200,
  // Maximum height for product images
  maxHeight: 1200,
  // JPEG quality (1-100, lower = smaller file size)
  jpegQuality: 85,
  // PNG quality (1-100)
  pngQuality: 90,
  // WebP quality (1-100)
  webpQuality: 85,
  // Enable WebP conversion for better compression
  convertToWebP: true,
  // Strip metadata to reduce file size
  stripMetadata: true,
  // Progressive JPEG (better perceived performance)
  progressive: true,
  // Maximum file size in bytes (2MB)
  maxFileSize: 2 * 1024 * 1024,
};

/**
 * Compress an image buffer
 * @param {Buffer} imageBuffer - The image buffer to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Buffer>} - Compressed image buffer
 */
async function compressImage(imageBuffer, options = {}) {
  try {
    const config = { ...COMPRESSION_CONFIG, ...options };
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const format = metadata.format.toLowerCase();
    
    // Create sharp instance with initial transformations
    let sharpInstance = sharp(imageBuffer);
    
    // Resize if image is larger than max dimensions
    if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
      sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Apply format-specific compression with metadata stripping
    let outputBuffer;
    
    // Apply metadata stripping if enabled
    if (config.stripMetadata) {
      sharpInstance = sharpInstance.withMetadata({}); // Remove all metadata
    }
    
    if (config.convertToWebP && (format === 'jpeg' || format === 'jpg' || format === 'png')) {
      // Convert to WebP for better compression
      outputBuffer = await sharpInstance
        .webp({ quality: config.webpQuality })
        .toBuffer();
    } else if (format === 'jpeg' || format === 'jpg') {
      // JPEG compression
      outputBuffer = await sharpInstance
        .jpeg({ 
          quality: config.jpegQuality,
          progressive: config.progressive,
          mozjpeg: true, // Better compression
        })
        .toBuffer();
    } else if (format === 'png') {
      // PNG compression
      outputBuffer = await sharpInstance
        .png({ 
          quality: config.pngQuality,
          compressionLevel: 9, // Maximum compression
        })
        .toBuffer();
    } else {
      // For other formats, just resize if needed
      outputBuffer = await sharpInstance.toBuffer();
    }
    
    // Check if compressed size is acceptable
    if (outputBuffer.length > config.maxFileSize) {
      // If still too large, apply more aggressive compression
      const aggressiveQuality = Math.max(60, config.webpQuality - 15);
      
      // Re-process with more aggressive settings
      let aggressiveInstance = sharp(imageBuffer);
      
      // Resize if needed
      if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
        aggressiveInstance = aggressiveInstance.resize(
          Math.floor(config.maxWidth * 0.9), 
          Math.floor(config.maxHeight * 0.9), 
          {
            fit: 'inside',
            withoutEnlargement: true,
          }
        );
      }
      
      // Convert to WebP with aggressive quality
      outputBuffer = await aggressiveInstance
        .withMetadata({}) // Remove metadata
        .webp({ quality: aggressiveQuality })
        .toBuffer();
    }
    
    // Log compression stats
    const originalSize = imageBuffer.length;
    const compressedSize = outputBuffer.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`Image compressed: ${(originalSize / 1024).toFixed(2)}KB → ${(compressedSize / 1024).toFixed(2)}KB (${compressionRatio}% reduction)`);
    
    return outputBuffer;
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original buffer if compression fails
    return imageBuffer;
  }
}

/**
 * Compress multiple images
 * @param {Array<Buffer>} imageBuffers - Array of image buffers
 * @param {Object} options - Compression options
 * @returns {Promise<Array<Buffer>>} - Array of compressed image buffers
 */
async function compressImages(imageBuffers, options = {}) {
  try {
    const compressionPromises = imageBuffers.map(buffer => compressImage(buffer, options));
    return await Promise.all(compressionPromises);
  } catch (error) {
    console.error('Batch image compression error:', error);
    return imageBuffers; // Return original buffers if compression fails
  }
}

/**
 * Get optimal compression settings based on file size
 * @param {number} fileSize - Original file size in bytes
 * @returns {Object} - Compression configuration
 */
function getOptimalCompressionConfig(fileSize) {
  const config = { ...COMPRESSION_CONFIG };
  
  // If file is already small, use less aggressive compression
  if (fileSize < 500 * 1024) { // Less than 500KB
    config.jpegQuality = 90;
    config.webpQuality = 90;
    config.pngQuality = 95;
  } 
  // If file is very large, use more aggressive compression
  else if (fileSize > 5 * 1024 * 1024) { // More than 5MB
    config.jpegQuality = 75;
    config.webpQuality = 75;
    config.maxWidth = 1000;
    config.maxHeight = 1000;
  }
  
  return config;
}

module.exports = {
  compressImage,
  compressImages,
  getOptimalCompressionConfig,
  COMPRESSION_CONFIG,
};

