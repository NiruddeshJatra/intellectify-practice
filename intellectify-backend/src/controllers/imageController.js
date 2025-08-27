const fileStorageService = require('../services/fileStorageService');
const AppError = require('../utils/appError');

/**
 * @description Upload image to temporary storage
 * @route POST /api/images/upload-temp
 * @access Private (Admin only)
 */
const uploadTempImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE');
    }

    // Save the file using image service
    const savedFile = await fileStorageService.saveImage({
      originalname: req.file.originalname,
      buffer: req.file.buffer,
      size: req.file.size,
      mimetype: req.file.mimetype
    }, 'TEMP');

    res.status(201).json({
      success: true,
      data: savedFile
    });
  } catch (error) {
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds the maximum allowed size of 5MB', 400, 'FILE_TOO_LARGE'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE'));
    }
    next(error);
  }
};

module.exports = {
  uploadTempImage
};
