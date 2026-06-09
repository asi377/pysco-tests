const express = require('express');
const { optionalAuth } = require('../../middlewares/authMiddleware');
const {
  sessionValidator,
  singleAnswerValidator,
} = require('../../api/middlewares/validator');
const {
  getTests, getTestBySlug, getQuestions,
  checkIncompleteSession, createSession,
  getCurrentQuestion, submitOneAnswer, submitAnswers,
  getSession,
} = require('./test.controller');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'تعداد درخواست‌های شما بیش از حد مجاز است' },
  standardHeaders: true,
  legacyHeaders: false,
});

const answerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'تعداد درخواست‌های شما بیش از حد مجاز است' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', generalLimiter, getTests);
router.get('/:slug', generalLimiter, getTestBySlug);
router.get('/:slug/questions', generalLimiter, optionalAuth, getQuestions);
router.get('/:slug/incomplete-session', optionalAuth, checkIncompleteSession);
router.post('/:slug/session', optionalAuth, sessionValidator, createSession);
router.post('/:slug/answers', optionalAuth, submitAnswers);
router.get('/:slug/current-question', optionalAuth, getCurrentQuestion);
router.post('/:slug/submit-answer', optionalAuth, singleAnswerValidator, answerLimiter, submitOneAnswer);
router.get('/:slug/session/:sessionId', optionalAuth, getSession);

module.exports = router;
