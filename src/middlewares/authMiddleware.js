const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'لطفاً وارد شوید یا به عنوان مهمان ادامه دهید',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type === 'user') {
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'کاربر یافت نشد',
                });
            }
            req.user = user;
            req.tokenType = 'user';
        } else if (decoded.type === 'guest') {
            const user = await User.findOne({ guestToken: decoded.guestToken });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'توکن مهمان نامعتبر است',
                });
            }
            req.guest = user;
            req.tokenType = 'guest';
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'توکن نامعتبر یا منقضی شده',
        });
    }
};

const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        req.tokenType = 'none';
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type === 'user') {
            const user = await User.findById(decoded.id);
            if (user) {
                req.user = user;
                req.tokenType = 'user';
            } else {
                req.tokenType = 'none';
            }
        } else if (decoded.type === 'guest') {
            const user = await User.findOne({ guestToken: decoded.guestToken });
            if (user) {
                req.guest = user;
                req.tokenType = 'guest';
            } else {
                req.tokenType = 'none';
            }
        } else {
            req.tokenType = 'none';
        }
    } catch (error) {
        req.tokenType = 'none';
    }

    next();
};

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'دسترسی ادمین لازم است',
        });
    }
    next();
};

module.exports = { protect, optionalAuth, adminOnly };