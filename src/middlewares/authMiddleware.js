const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const AppError = require('../domain/errors/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const ADMIN_HARDCODED_ID = 'admin_hardcoded';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const isTokenBlacklisted = async (token) => {
  const hash = hashToken(token);
  return TokenBlacklist.exists({ tokenHash: hash });
};

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('لطفاً وارد شوید یا به عنوان مهمان ادامه دهید', 401));
    }

    if (await isTokenBlacklisted(token)) {
      return next(new AppError('توکن منقضی شده است. لطفاً دوباره وارد شوید', 401));
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === 'refresh') {
      return next(new AppError('توکن نامعتبر است', 401));
    }

    if (decoded.id === ADMIN_HARDCODED_ID && decoded.role === 'admin') {
      req.user = { _id: ADMIN_HARDCODED_ID, role: 'admin', email: 'ali@gmail.com', fullName: 'مدیر سیستم' };
      req.tokenType = 'user';
      return next();
    }

    if (decoded.guestToken) {
      const user = await User.findOne({ guestToken: decoded.guestToken });
      if (!user) {
        return next(new AppError('توکن مهمان نامعتبر است', 401));
      }
      req.guest = user;
      req.tokenType = 'guest';
    } else if (decoded.id) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new AppError('کاربر یافت نشد', 401));
      }
      req.user = user;
      req.tokenType = 'user';
    }

    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.tokenType = 'none';
      return next();
    }

    if (await isTokenBlacklisted(token)) {
      req.tokenType = 'none';
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === 'refresh') {
      req.tokenType = 'none';
      return next();
    }

    if (decoded.id === ADMIN_HARDCODED_ID && decoded.role === 'admin') {
      req.user = { _id: ADMIN_HARDCODED_ID, role: 'admin', email: 'ali@gmail.com', fullName: 'مدیر سیستم' };
      req.tokenType = 'user';
      return next();
    }

    if (decoded.guestToken) {
      const user = await User.findOne({ guestToken: decoded.guestToken });
      if (user) {
        req.guest = user;
        req.tokenType = 'guest';
        return next();
      }
    }

    if (decoded.id) {
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.tokenType = 'user';
        return next();
      }
    }
  } catch (error) {
    console.error('OptionalAuth error:', error);
  }

  req.tokenType = 'none';
  return next();
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('دسترسی ادمین لازم است', 403));
  }
  next();
};

module.exports = { protect, optionalAuth, adminOnly };
