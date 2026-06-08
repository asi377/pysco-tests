const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Test = require('../models/Test');
const TokenBlacklist = require('../models/TokenBlacklist');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const HARDCODED_ADMIN_EMAIL = 'ali@gmail.com';
const HARDCODED_ADMIN_TOKEN = '296613824431';

const TOKEN_EXPIRY_USER = '24h';
const TOKEN_EXPIRY_ADMIN = '1h';
const TOKEN_EXPIRY_GUEST = '7d';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const register = catchAsync(async (req, res, next) => {
  const { fullName, email, password, guestToken, gender } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('این ایمیل قبلاً ثبت شده است', 400));
  }

  let user;
  let upgraded = false;

  if (guestToken) {
    const guestUser = await User.findOne({ guestToken, isGuest: true });
    if (!guestUser) {
      return next(new AppError('توکن مهمان نامعتبر است', 400));
    }
    guestUser.fullName = fullName;
    guestUser.email = email;
    guestUser.password = password;
    guestUser.isGuest = false;
    guestUser.guestToken = undefined;
    await guestUser.save();
    user = guestUser;
    upgraded = true;
  } else {
    user = await User.create({ fullName, email, password, gender: gender || '' });
  }

  const token = generateToken(user, 'user');

  res.status(201).json({
    success: true,
    message: upgraded ? 'ثبت‌نام با موفقیت انجام شد (ارتقا از مهمان)' : 'ثبت‌نام با موفقیت انجام شد',
    data: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, token },
  });
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_TOKEN) {
    const adminToken = jwt.sign(
      { id: 'admin_hardcoded', type: 'user', role: 'admin' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: TOKEN_EXPIRY_ADMIN }
    );
    res.json({
      success: true,
      message: 'ورود ادمین با موفقیت انجام شد',
      data: { id: 'admin_hardcoded', fullName: 'مدیر سیستم', email: HARDCODED_ADMIN_EMAIL, role: 'admin', token: adminToken },
    });
    return;
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new AppError('ایمیل یا رمز عبور اشتباه است', 401));
  }

  if (user.isGuest) {
    return next(new AppError('این حساب یک حساب مهمان است. لطفاً ثبت‌نام کنید', 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('ایمیل یا رمز عبور اشتباه است', 401));
  }

  const token = generateToken(user, 'user');

  res.json({
    success: true,
    message: 'ورود با موفقیت انجام شد',
    data: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, token },
  });
});

const guestLogin = catchAsync(async (req, res) => {
  const tests = await Test.find({ isActive: true });

  const guestUser = await User.create({
    fullName: 'مهمان',
    email: `guest_${Date.now()}@guest.local`,
    isGuest: true,
    guestToken: `gt_${Date.now()}_${generateSecureToken()}`,
  });

  const token = generateToken(guestUser, 'guest');

  res.status(201).json({
    success: true,
    message: 'حساب مهمان ایجاد شد',
    token,
    id: guestUser._id,
    guestToken: guestUser.guestToken,
    fullName: 'مهمان',
    isGuest: true,
    tests: tests.map(t => ({ id: t._id, slug: t.slug, title: t.title, type: t.type })),
  });
});

const logout = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('توکن یافت نشد', 400));
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.decode(token);

  if (decoded?.exp) {
    await TokenBlacklist.create({
      tokenHash: hashToken(token),
      expiresAt: new Date(decoded.exp * 1000),
    });
  }

  res.json({ success: true, message: 'خروج با موفقیت انجام شد' });
});

const generateToken = (user, type) => {
  let payload;
  let expiresIn;

  if (type === 'guest') {
    payload = { guestToken: user.guestToken, type: 'guest' };
    expiresIn = TOKEN_EXPIRY_GUEST;
  } else {
    payload = { id: user._id, type: 'user' };
    expiresIn = TOKEN_EXPIRY_USER;
  }

  const secret = process.env.JWT_SECRET || 'default-secret';
  return jwt.sign(payload, secret, { expiresIn });
};

const generateSecureToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

module.exports = { register, login, guestLogin, logout };
