const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

const ADMIN_HARDCODED_ID = 'admin_hardcoded';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'لطفاً وارد شوید یا به عنوان مهمان ادامه دهید',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.id === ADMIN_HARDCODED_ID && decoded.role === 'admin') {
      req.user = { _id: ADMIN_HARDCODED_ID, role: 'admin', email: 'ali@gmail.com', fullName: 'مدیر سیستم' };
      req.tokenType = 'user';
      return next();
    }

    if (decoded.guestToken) {
      const user = await User.findOne({ guestToken: decoded.guestToken });
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'توکن مهمان نامعتبر است',
        });
        return;
      }
      req.guest = user;
      req.tokenType = 'guest';
    } else if (decoded.id) {
      const user = await User.findById(decoded.id);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'کاربر یافت نشد',
        });
        return;
      }
      req.user = user;
      req.tokenType = 'user';
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
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
    const decoded = jwt.verify(token, JWT_SECRET);

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
    res.status(403).json({
      success: false,
      message: 'دسترسی ادمین لازم است',
    });
    return;
  }
  next();
};

module.exports = { protect, optionalAuth, adminOnly };
