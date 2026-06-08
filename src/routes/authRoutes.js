const express = require('express');
const {
  registerValidator,
  loginValidator,
} = require('../middlewares/validator');
const { protect } = require('../middlewares/authMiddleware');
const {
  register,
  login,
  guestLogin,
  refresh,
  logout,
  logoutAll,
} = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message:
      'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, registerValidator, register);
router.post('/login', authLimiter, loginValidator, login);
router.post('/guest', guestLogin);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

module.exports = router;
