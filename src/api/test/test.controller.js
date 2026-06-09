const testService = require('../../domain/services/test.service');
const {
  GetTestsDTO, GetQuestionsDTO, CreateSessionDTO,
  SubmitAnswerDTO, SubmitAnswersDTO, GetSessionDTO,
  GetCurrentQuestionDTO,
} = require('./test.dto');
const catchAsync = require('../../infrastructure/utils/catchAsync');

const extractIdentity = (req) => ({
  userId: req.tokenType === 'user' ? req.user?._id : null,
  guestToken: req.tokenType === 'guest' ? req.guest?.guestToken : null,
});

const getTests = catchAsync(async (req, res) => {
  const dto = new GetTestsDTO(req.query);
  const data = await testService.getTests(dto.page, dto.limit);
  res.json({ success: true, data });
});

const getTestBySlug = catchAsync(async (req, res, next) => {
  const test = await testService.getTestBySlug(req.params.slug);
  res.json({
    success: true,
    data: {
      id: test._id, slug: test.slug, title: test.title, type: test.type,
      description: test.description, duration: test.duration, totalQuestions: test.totalQuestions,
    },
  });
});

const getQuestions = catchAsync(async (req, res, next) => {
  const dto = new GetQuestionsDTO(req.query);
  const data = await testService.getQuestions(req.params.slug, dto.lang, dto.page, dto.limit);
  res.json({ success: true, data });
});

const checkIncompleteSession = catchAsync(async (req, res, next) => {
  const data = await testService.checkIncompleteSession(req.params.slug, extractIdentity(req));
  res.json({ success: true, data });
});

const createSession = catchAsync(async (req, res, next) => {
  const dto = new CreateSessionDTO(req.body);
  const { sessionId, resumed } = await testService.createOrResumeSession(
    req.params.slug, extractIdentity(req), dto.forceNew,
  );

  if (resumed) {
    res.json({
      success: true,
      message: 'جلسه فعال موجود بازیابی شد',
      data: { sessionId, resumed: true },
    });
  } else {
    res.status(201).json({
      success: true,
      message: 'جلسه تست ایجاد شد',
      data: { sessionId, resumed: false },
    });
  }
});

const getCurrentQuestion = catchAsync(async (req, res, next) => {
  const dto = new GetCurrentQuestionDTO(req.query);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  const data = await testService.getCurrentQuestion(
    req.params.slug, dto.sessionId, extractIdentity(req),
  );
  res.json({ success: true, data });
});

const submitOneAnswer = catchAsync(async (req, res, next) => {
  const dto = new SubmitAnswerDTO(req.body);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  const data = await testService.submitOneAnswer(
    req.params.slug, dto.sessionId, dto.answer, extractIdentity(req),
  );
  res.json({ success: true, data });
});

const submitAnswers = catchAsync(async (req, res, next) => {
  const dto = new SubmitAnswersDTO(req.body);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  const data = await testService.submitAnswers(
    req.params.slug, dto.sessionId, dto.answers, extractIdentity(req),
  );
  res.json({
    success: true,
    message: data.isComplete ? 'پاسخ‌ها ذخیره شد و آزمون تکمیل شد' : 'پاسخ‌ها ذخیره شد',
    data: { sessionId: data.sessionId, answeredCount: data.answeredCount, totalQuestions: data.totalQuestions, isComplete: data.isComplete },
  });
});

const getSession = catchAsync(async (req, res, next) => {
  const dto = new GetSessionDTO(req.params);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  const data = await testService.getSession(dto.slug, dto.sessionId, extractIdentity(req));
  res.json({ success: true, data });
});

module.exports = {
  getTests, getTestBySlug, getQuestions,
  checkIncompleteSession, createSession,
  getCurrentQuestion, submitOneAnswer, submitAnswers, getSession,
};
