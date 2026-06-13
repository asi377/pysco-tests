const express = require('express');
const { protect, optionalAuth, adminOnly } = require('../middlewares/authMiddleware');
const {
  getResult, getMyResults, getIncompleteSessions,
  calculateScore, shareResult, deleteResult, getAdminSharedResults,
} = require('./result.controller');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const resultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'تعداد درخواست‌های شما بیش از حد مجاز است' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/:slug/result/:sessionId', optionalAuth, resultLimiter, getResult);
router.get('/my', protect, resultLimiter, getMyResults);
router.get('/my/incomplete', protect, resultLimiter, getIncompleteSessions);
router.post('/calculate', protect, resultLimiter, calculateScore);
router.post('/share', protect, resultLimiter, shareResult);
router.delete('/:id', protect, resultLimiter, deleteResult);
router.get('/admin/shared', protect, adminOnly, resultLimiter, getAdminSharedResults);

module.exports = router;
