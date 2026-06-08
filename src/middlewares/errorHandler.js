const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => {
    const message = `شناسه نامعتبر: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue).join('، ');
    const message = `این ${field} قبلاً ثبت شده است`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((e) => e.message);
    const message = `اطلاعات وارد شده نامعتبر است: ${errors.join('، ')}`;
    return new AppError(message, 400);
    console.log(err);
};

const handleJWTError = () =>
    new AppError('توکن نامعتبر است. لطفاً دوباره وارد شوید', 401);
const handleJWTExpiredError = () =>
    new AppError('نشست شما منقضی شده است. لطفاً دوباره وارد شوید', 401);

const errorHandler = (err, _req, res, _next) => {
    console.error('Error:', err);

    let error = {
        ...err,
        message: err.message,
        name: err.name,
        stack: err.stack,
    };

    if (err.code) error.code = err.code;

    // MongoDB: invalid ObjectId
    if (error.name === 'CastError') {
        error = handleCastErrorDB(error);
    }

    // MongoDB: duplicate key
    if (error.code === 11000) {
        error = handleDuplicateFieldsDB(error);
    }

    // MongoDB: validation error
    if (error.name === 'ValidationError') {
        error = handleValidationErrorDB(error);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    }

    const statusCode = error.statusCode || 500;
    const message = error.isOperational
        ? error.message
        : 'خطای سرور. لطفاً دوباره تلاش کنید';

    res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = { AppError, errorHandler };
