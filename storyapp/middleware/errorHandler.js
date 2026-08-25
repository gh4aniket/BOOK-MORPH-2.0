const multer = require('multer');

/**
 * Wrap an async route handler so thrown errors / rejected promises are
 * forwarded to next() instead of crashing the process or hanging the request.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Express error-handling middleware (must be registered last, with 4 args).
 */
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large';
    if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files uploaded';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field';

    return res.status(400).json({
      success: false,
      message,
      error: err.message
    });
  }

  // Multer fileFilter errors and other thrown errors land here too.
  const status = err.status || 500;

  console.error('Unhandled error:', err);

  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
    error: err.message
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

module.exports = { asyncHandler, errorHandler, notFoundHandler };
