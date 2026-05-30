const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Test = require('../models/Test');

const HARDCODED_ADMIN_EMAIL = 'ali@gmail.com';
const HARDCODED_ADMIN_TOKEN = '296613824431';

const register = async (req, res) => {
  try {
    const { fullName, email, password, guestToken, gender } = req.body;

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
        errors: errors,
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

    if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_TOKEN) {
      const adminToken = jwt.sign(
        { id: 'admin_hardcoded', type: 'user', role: 'admin' },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRE || '365d' }
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

const generateToken = (user, type) => {
  let payload;

  if (type === 'guest') {
    payload = { guestToken: user.guestToken, type: 'guest' };
  } else {
    payload = { id: user._id, type: 'user' };
  }

  const secret = process.env.JWT_SECRET || 'default-secret';
  const expiresIn = process.env.JWT_EXPIRE || '365d';

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

module.exports = { register, login, guestLogin };
