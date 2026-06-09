const AppError = require('../../domain/errors/AppError');

const handleCastErrorDB = (err) => {
  const message = `شناسه نامعتبر: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue).join('، ');
  const message = `این ${field} قبلاً ثبت شده است`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `اطلاعات وارد شده نامعتبر است: ${errors.join('، ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
  new AppError('توکن نامعتبر است. لطفاً دوباره وارد شوید', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('نشست شما منقضی شده است. لطفاً دوباره وارد شوید', 401, 'TOKEN_EXPIRED');

const errorHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  let error = { ...err, message: err.message, name: err.name, stack: err.stack };
  if (err.code) error.code = err.code;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  else if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  else if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  else if (error.name === 'JsonWebTokenError') error = handleJWTError();
  else if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;
  const message = error.isOperational
    ? error.message
    : 'خطای سرور. لطفاً دوباره تلاش کنید';

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.code && { code: error.code }),
  });
};

module.exports = { AppError, errorHandler };
