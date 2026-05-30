class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی',
      errors,
    });
    return;
  }

  if (err.code === 11000) {
    res.status(400).json({
      success: false,
      message: 'داده تکراری',
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'شناسه نامعتبر',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'خطای سرور',
  });
};

module.exports = { AppError, errorHandler };