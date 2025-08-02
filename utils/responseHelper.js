// Standardized API response helper
const responseHelper = {
  success: (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },

  error: (res, message = 'Error', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  },

  validationError: (res, errors) => {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  },

  paginated: (res, data, pagination, message = 'Data fetched successfully') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = responseHelper;