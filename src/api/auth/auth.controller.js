const authService = require('../../domain/services/auth.service');
const tokenService = require('../../domain/services/token.service');
const catchAsync = require('../../infrastructure/utils/catchAsync');

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const ADMIN_EMAIL = process.env.HARDCODED_ADMIN_EMAIL || 'ali@gmail.com';
const ADMIN_TOKEN = process.env.HARDCODED_ADMIN_TOKEN || '296613824431';

const register = catchAsync(async (req, res, next) => {
  const { user, upgraded } = await authService.register(req.body);

  const accessToken = tokenService.signAccessToken(user, 'user');
  const refreshToken = await tokenService.signAndStoreRefreshToken(user);

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    message: upgraded
      ? 'ثبت‌نام با موفقیت انجام شد (ارتقا از مهمان)'
      : 'ثبت‌نام با موفقیت انجام شد',
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accessToken,
    },
  });
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_TOKEN) {
    const adminToken = tokenService.signAdminToken();
    res.json({
      success: true,
      message: 'ورود ادمین با موفقیت انجام شد',
      data: {
        id: 'admin_hardcoded',
        fullName: 'مدیر سیستم',
        email: ADMIN_EMAIL,
        role: 'admin',
        accessToken: adminToken,
      },
    });
    return;
  }

  const user = await authService.login({ email, password });

  const accessToken = tokenService.signAccessToken(user, 'user');
  const refreshToken = await tokenService.signAndStoreRefreshToken(user);

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

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

const guestLogin = catchAsync(async (req, res) => {
  const Test = require('../../models/Test');
  const User = require('../../models/User');

  const tests = await Test.find({ isActive: true });

  const guestUser = await User.create({
    fullName: 'مهمان',
    email: `guest_${Date.now()}@guest.local`,
    isGuest: true,
    guestToken: `gt_${Date.now()}_${generateSecureToken()}`,
  });

  const accessToken = tokenService.signAccessToken(guestUser, 'guest');

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

const refresh = catchAsync(async (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const RefreshToken = require('../../models/RefreshToken');
  const User = require('../../models/User');
  const AppError = require('../../domain/errors/AppError');

  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return next(new AppError('رفرش توکن یافت نشد. لطفاً دوباره وارد شوید', 401, 'REFRESH_MISSING'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
  } catch (err) {
    return next(new AppError('رفرش توکن نامعتبر یا منقضی شده است. لطفاً دوباره وارد شوید', 401, 'REFRESH_INVALID'));
  }

  if (decoded.type !== 'refresh' || !decoded.id) {
    return next(new AppError('رفرش توکن نامعتبر است', 401, 'REFRESH_INVALID'));
  }

  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const storedToken = await RefreshToken.findOne({ tokenHash, userId: decoded.id });

  if (!storedToken) {
    return next(new AppError('رفرش توکن قبلاً استفاده یا باطل شده است. لطفاً دوباره وارد شوید', 401, 'REFRESH_REVOKED'));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('کاربر یافت نشد', 401, 'USER_NOT_FOUND'));
  }

  const accessToken = tokenService.signAccessToken(user, 'user');

  res.json({
    success: true,
    data: { accessToken },
  });
});

const logout = catchAsync(async (req, res, next) => {
  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');
  const RefreshToken = require('../../models/RefreshToken');
  const TokenBlacklist = require('../../models/TokenBlacklist');

  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await RefreshToken.deleteOne({ tokenHash });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.split(' ')[1];
    const decoded = jwt.decode(accessToken);
    if (decoded?.exp) {
      await TokenBlacklist.create({
        tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
        expiresAt: new Date(decoded.exp * 1000),
      });
    }
  }

  res.json({ success: true, message: 'خروج با موفقیت انجام شد' });
});

const logoutAll = catchAsync(async (req, res, next) => {
  const RefreshToken = require('../../models/RefreshToken');

  await RefreshToken.deleteMany({ userId: req.user._id });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });

  res.json({ success: true, message: 'خروج از تمام دستگاه‌ها با موفقیت انجام شد' });
});

function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

module.exports = {
  register, login, guestLogin, refresh, logout, logoutAll,
};
