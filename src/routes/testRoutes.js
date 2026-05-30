const express = require('express');
const { optionalAuth } = require('../middlewares/authMiddleware');
const { sessionValidator, answerValidator } = require('../middlewares/validator');
const {
  getTests,
  getTestBySlug,
  getQuestions,
  checkIncompleteSession,
  createSession,
  submitAnswers,
  getSession,
} = require('../controllers/testController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', generalLimiter, getTests);
router.get('/:slug', generalLimiter, getTestBySlug);
router.get('/:slug/questions', generalLimiter, getQuestions);

router.get('/:slug/incomplete-session', optionalAuth, checkIncompleteSession);
router.post('/:slug/session', optionalAuth, sessionValidator, createSession);
router.post('/:slug/answers', optionalAuth, answerValidator, submitAnswers);
router.get('/:slug/session/:sessionId', optionalAuth, getSession);

module.exports = router;