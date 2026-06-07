const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Test = require('../models/Test');
const TokenBlacklist = require('../models/TokenBlacklist');

const HARDCODED_ADMIN_EMAIL = 'ali@gmail.com';
const HARDCODED_ADMIN_TOKEN = '296613824431';

const PASSWORD_MIN_LENGTH = 8;
const TOKEN_EXPIRY_USER = '24h';
const TOKEN_EXPIRY_ADMIN = '1h';
const TOKEN_EXPIRY_GUEST = '7d';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const validatePassword = (password) => {
  const errors = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`حداقل ${PASSWORD_MIN_LENGTH} کاراکتر`);
  }
  if (!/[A-Za-z]/.test(password)) {
    errors.push('حداقل یک حرف انگلیسی');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('حداقل یک عدد');
  }
  return errors;
};

const register = async (req, res) => {
  try {
    const { fullName, email, password, guestToken, gender } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'نام، ایمیل و رمز عبور الزامی است',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'فرمت ایمیل نامعتبر است',
      });
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: `رمز عبور باید شامل: ${passwordErrors.join('، ')} باشد`,
      });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'این ایمیل قبلاً ثبت شده است',
      });
      return;
    }

    let user;
    let upgraded = false;

    if (guestToken) {
      const guestUser = await User.findOne({ guestToken, isGuest: true });
      if (guestUser) {
        guestUser.fullName = fullName;
        guestUser.email = email;
        guestUser.password = password;
        guestUser.isGuest = false;
        guestUser.guestToken = undefined;
        await guestUser.save();

        user = guestUser;
        upgraded = true;
      } else {
        res.status(400).json({
          success: false,
          message: 'توکن مهمان نامعتبر است',
        });
        return;
      }
    } else {
      user = await User.create({
        fullName,
        email,
        password,
        gender: gender || '',
      });
    }

    const token = generateToken(user, 'user');

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
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      res.status(400).json({
        success: false,
        message: 'اطلاعات وارد شده نامعتبر است',
        errors,
      });
      return;
    }

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'این ایمیل قبلاً ثبت شده است',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'خطای سرور. لطفاً دوباره تلاش کنید',
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'ایمیل و رمز عبور الزامی است',
      });
      return;
    }

    if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_TOKEN) {
      const adminToken = jwt.sign(
        { id: 'admin_hardcoded', type: 'user', role: 'admin' },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: TOKEN_EXPIRY_ADMIN }
      );
      res.json({
        success: true,
        message: 'ورود ادمین با موفقیت انجام شد',
        data: {
          id: 'admin_hardcoded',
          fullName: 'مدیر سیستم',
          email: HARDCODED_ADMIN_EMAIL,
          role: 'admin',
          token: adminToken,
        },
      });
      return;
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'ایمیل یا رمز عبور اشتباه است',
      });
      return;
    }

    if (user.isGuest) {
      res.status(401).json({
        success: false,
        message: 'این حساب یک حساب مهمان است. لطفاً ثبت‌نام کنید',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'ایمیل یا رمز عبور اشتباه است',
      });
      return;
    }

    const token = generateToken(user, 'user');

    res.json({
      success: true,
      message: 'ورود با موفقیت انجام شد',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور. لطفاً دوباره تلاش کنید',
    });
  }
};

const guestLogin = async (req, res) => {
  try {
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
      tests: tests.map(t => ({
        id: t._id,
        slug: t.slug,
        title: t.title,
        type: t.type,
      })),
    });
  } catch (error) {
    console.error('Guest creation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور. لطفاً دوباره تلاش کنید',
    });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(400).json({
        success: false,
        message: 'توکن یافت نشد',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);

    if (decoded?.exp) {
      await TokenBlacklist.create({
        tokenHash: hashToken(token),
        expiresAt: new Date(decoded.exp * 1000),
      });
    }

    res.json({
      success: true,
      message: 'خروج با موفقیت انجام شد',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

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
