const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            success: false,
            message: 'خطا در اعتبارسنجی',
            errors,
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'داده تکراری',
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'شناسه نامعتبر',
        });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'خطای سرور',
    });
};

module.exports = errorHandler;