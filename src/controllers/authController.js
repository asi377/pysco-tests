const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Test = require('../models/Test');
const RefreshToken = require('../models/RefreshToken');
const TokenBlacklist = require('../models/TokenBlacklist');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const HARDCODED_ADMIN_EMAIL = 'ali@gmail.com';
const HARDCODED_ADMIN_TOKEN = '296613824431';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const TOKEN_EXPIRY_ADMIN = '1h';
const TOKEN_EXPIRY_GUEST = '7d';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const isProduction = process.env.NODE_ENV === 'production';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
};

// ============================================================
// توکن سازها
// ============================================================

const generateAccessToken = (user, type) => {
  let payload;
  let expiresIn;

  if (type === 'guest') {
    payload = { guestToken: user.guestToken, type: 'guest' };
    expiresIn = TOKEN_EXPIRY_GUEST;
  } else {
    payload = { id: user._id, type: 'user' };
    expiresIn = ACCESS_TOKEN_EXPIRY;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const generateAndStoreRefreshToken = async (user) => {
  const payload = { id: user._id, type: 'refresh' };
  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return refreshToken;
};

// ============================================================
// ثبت‌نام
// ============================================================

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

  const accessToken = generateAccessToken(user, 'user');
  const refreshToken = await generateAndStoreRefreshToken(user);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

  res.status(201).json({
    success: true,
    message: upgraded ? 'ثبت‌نام با موفقیت انجام شد (ارتقا از مهمان)' : 'ثبت‌نام با موفقیت انجام شد',
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accessToken,
    },
  });
});

// ============================================================
// ورود
// ============================================================

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // ادمین هاردکُد — بدون رفرش توکن
  if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_TOKEN) {
    const adminToken = jwt.sign(
      { id: 'admin_hardcoded', type: 'user', role: 'admin' },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY_ADMIN },
    );
    res.json({
      success: true,
      message: 'ورود ادمین با موفقیت انجام شد',
      data: {
        id: 'admin_hardcoded',
        fullName: 'مدیر سیستم',
        email: HARDCODED_ADMIN_EMAIL,
        role: 'admin',
        accessToken: adminToken,
      },
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

  const accessToken = generateAccessToken(user, 'user');
  const refreshToken = await generateAndStoreRefreshToken(user);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

  res.json({
    success: true,
    message: 'ورود با موفقیت انجام شد',
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accessToken,
    },
  });
});

// ============================================================
// ورود مهمان — بدون رفرش توکن
// ============================================================

const guestLogin = catchAsync(async (req, res) => {
  const tests = await Test.find({ isActive: true });

  const guestUser = await User.create({
    fullName: 'مهمان',
    email: `guest_${Date.now()}@guest.local`,
    isGuest: true,
    guestToken: `gt_${Date.now()}_${generateSecureToken()}`,
  });

  const accessToken = generateAccessToken(guestUser, 'guest');

  res.status(201).json({
    success: true,
    message: 'حساب مهمان ایجاد شد',
    accessToken,
    id: guestUser._id,
    guestToken: guestUser.guestToken,
    fullName: 'مهمان',
    isGuest: true,
    tests: tests.map(t => ({ id: t._id, slug: t.slug, title: t.title, type: t.type })),
  });
});

// ============================================================
// تازه‌سازی accessToken با استفاده از refreshToken کوکی
// ============================================================

const refresh = catchAsync(async (req, res, next) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return next(new AppError('رفرش توکن یافت نشد. لطفاً دوباره وارد شوید', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return next(new AppError('رفرش توکن نامعتبر یا منقضی شده است. لطفاً دوباره وارد شوید', 401));
  }

  if (decoded.type !== 'refresh' || !decoded.id) {
    return next(new AppError('رفرش توکن نامعتبر است', 401));
  }

  const tokenHash = hashToken(token);
  const storedToken = await RefreshToken.findOne({ tokenHash, userId: decoded.id });

  if (!storedToken) {
    return next(new AppError('رفرش توکن قبلاً استفاده یا باطل شده است. لطفاً دوباره وارد شوید', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('کاربر یافت نشد', 401));
  }

  const accessToken = generateAccessToken(user, 'user');

  res.json({
    success: true,
    data: { accessToken },
  });
});

// ============================================================
// خروج از دستگاه فعلی
// ============================================================

const logout = catchAsync(async (req, res, next) => {
  // حذف refreshToken از دیتابیس
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    const tokenHash = hashToken(token);
    await RefreshToken.deleteOne({ tokenHash });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  }

  // بلاک‌لیست accessToken فعلی
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.split(' ')[1];
    const decoded = jwt.decode(accessToken);
    if (decoded?.exp) {
      await TokenBlacklist.create({
        tokenHash: hashToken(accessToken),
        expiresAt: new Date(decoded.exp * 1000),
      });
    }
  }

  res.json({ success: true, message: 'خروج با موفقیت انجام شد' });
});

// ============================================================
// خروج از تمام دستگاه‌ها
// ============================================================

const logoutAll = catchAsync(async (req, res, next) => {
  // حذف تمام رفرش توکن‌های این کاربر
  await RefreshToken.deleteMany({ userId: req.user._id });

  // پاک کردن کوکی مرورگر فعلی
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

  res.json({ success: true, message: 'خروج از تمام دستگاه‌ها با موفقیت انجام شد' });
});

// ============================================================
// ابزارها
// ============================================================

const generateSecureToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

module.exports = {
  register,
  login,
  guestLogin,
  refresh,
  logout,
  logoutAll,
};
