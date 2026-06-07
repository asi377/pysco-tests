const Test = require('../models/Test');
const Question = require('../models/neo/Question');
const TestSession = require('../models/TestSession');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const getTests = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const tests = await Test.find({ isActive: true })
    .select('slug title type description duration totalQuestions')
    .skip(skip).limit(limit).lean();

  const total = await Test.countDocuments({ isActive: true });

  res.json({
    success: true,
    data: { tests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

const getTestBySlug = catchAsync(async (req, res, next) => {
  const test = await Test.findOne({ slug: req.params.slug, isActive: true });

  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  res.json({
    success: true,
    data: {
      id: test._id, slug: test.slug, title: test.title, type: test.type,
      description: test.description, duration: test.duration, totalQuestions: test.totalQuestions,
    },
  });
});

const getQuestions = catchAsync(async (req, res, next) => {
  const test = await Test.findOne({ slug: req.params.slug, isActive: true });

  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  const lang = req.query.lang || 'fa';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const totalCount = await Question.countDocuments({ testId: test._id, isActive: true });

  const questions = await Question.find({ testId: test._id, isActive: true })
    .sort({ questionNumber: 1 }).skip(skip).limit(limit).lean();

  const formattedQuestions = questions.map(q => ({
    id: q._id, questionNumber: q.questionNumber,
    text: lang === 'en' ? q.text.en : q.text.fa,
    domain: lang === 'en' ? q.domain.en : q.domain.fa,
    facet: { name: lang === 'en' ? q.facet.en : q.facet.fa, code: q.facet.code },
    isReversed: q.isReversed,
    options: q.options.map(o => ({ value: o.value, label: lang === 'en' ? o.label.en : o.label.fa })),
  }));

  res.json({
    success: true,
    data: {
      testId: test._id, slug: test.slug, totalQuestions: totalCount,
      questions: formattedQuestions,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    },
  });
});

const checkIncompleteSession = catchAsync(async (req, res, next) => {
  const test = await Test.findOne({ slug: req.params.slug, isActive: true });
  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  let userId = null;
  let guestToken = null;
  if (req.tokenType === 'user') userId = req.user?._id;
  else if (req.tokenType === 'guest') guestToken = req.guest?.guestToken;

  if (!userId && !guestToken) {
    res.json({ success: true, data: { session: null } });
    return;
  }

  const existingSession = await TestSession.findOne({
    ...(userId ? { userId } : { guestToken }),
    testId: test._id, isCompleted: false,
  }).populate('testId', 'slug title type');

  if (!existingSession) {
    res.json({ success: true, data: { session: null } });
    return;
  }

  const questions = await Question.countDocuments({ testId: test._id, isActive: true });

  res.json({
    success: true,
    data: {
      session: {
        _id: existingSession._id, testId: existingSession.testId,
        startedAt: existingSession.startedAt,
        answered: existingSession.answers.length,
        total: questions,
        progress: Math.round((existingSession.answers.length / questions) * 100),
      },
    },
  });
});

const createSession = catchAsync(async (req, res, next) => {
  const test = await Test.findOne({ slug: req.params.slug, isActive: true });
  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  let userId = null;
  let guestToken = null;

  if (req.tokenType === 'user') {
    userId = req.user?._id;
  } else if (req.tokenType === 'guest') {
    guestToken = req.guest?.guestToken;
  } else {
    return next(new AppError('لطفاً وارد شوید یا به عنوان مهمان ادامه دهید', 401));
  }

  if (!req.body.forceNew) {
    const existingSession = await TestSession.findOne({
      ...(userId ? { userId } : { guestToken }),
      testId: test._id, isCompleted: false,
    });

    if (existingSession) {
      res.json({
        success: true,
        message: 'جلسه فعال موجود بازیابی شد',
        data: { sessionId: existingSession._id, resumed: true },
      });
      return;
    }
  }

  const sessionData = { testId: test._id };
  if (userId) sessionData.userId = userId;
  if (guestToken) sessionData.guestToken = guestToken;

  const session = await TestSession.create(sessionData);

  res.status(201).json({
    success: true,
    message: 'جلسه تست ایجاد شد',
    data: { sessionId: session._id, resumed: false },
  });
});

const getCurrentQuestion = catchAsync(async (req, res, next) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return next(new AppError('sessionId الزامی است', 400));
  }

  const test = await Test.findOne({ slug: req.params.slug, isActive: true });
  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  let userId = null;
  let guestToken = null;
  if (req.tokenType === 'user') userId = req.user?._id;
  else if (req.tokenType === 'guest') guestToken = req.guest?.guestToken;

  const session = await TestSession.findOne({
    _id: sessionId, testId: test._id,
    ...(userId ? { userId } : { guestToken }),
  });

  if (!session) {
    return next(new AppError('جلسه یافت نشد', 404));
  }

  const allQuestions = await Question.find({ testId: test._id, isActive: true })
    .sort({ questionNumber: 1 }).lean();

  const answeredIds = new Set(session.answers.map(a => a.questionId.toString()));
  const nextQuestion = allQuestions.find(q => !answeredIds.has(q._id.toString()));

  if (!nextQuestion) {
    res.json({ success: true, data: { completed: true, message: 'همه سوالات پاسخ داده شده' } });
    return;
  }

  res.json({
    success: true,
    data: {
      question: {
        id: nextQuestion._id, questionNumber: nextQuestion.questionNumber,
        text: nextQuestion.text.fa,
        domain: nextQuestion.domain.fa,
        facet: { name: nextQuestion.facet.fa, code: nextQuestion.facet.code },
        isReversed: nextQuestion.isReversed,
        options: nextQuestion.options.map(o => ({ value: o.value, label: o.label.fa })),
      },
      progress: { answered: session.answers.length, total: allQuestions.length },
    },
  });
});

const submitOneAnswer = catchAsync(async (req, res, next) => {
  const { sessionId, answer } = req.body;

  const test = await Test.findOne({ slug: req.params.slug, isActive: true });
  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  let userId = null;
  let guestToken = null;
  if (req.tokenType === 'user') userId = req.user?._id;
  else if (req.tokenType === 'guest') guestToken = req.guest?.guestToken;

  const session = await TestSession.findOne({
    _id: sessionId, testId: test._id,
    ...(userId ? { userId } : { guestToken }),
  });

  if (!session) {
    return next(new AppError('جلسه یافت نشد', 404));
  }

  if (session.isCompleted) {
    return next(new AppError('این جلسه قبلاً تکمیل شده است', 400));
  }

  const allQuestions = await Question.find({ testId: test._id, isActive: true })
    .sort({ questionNumber: 1 }).lean();

  const answeredIds = new Set(session.answers.map(a => a.questionId.toString()));
  const firstUnanswered = allQuestions.find(q => !answeredIds.has(q._id.toString()));

  if (!firstUnanswered) {
    res.json({ success: true, data: { completed: true, message: 'همه سوالات قبلاً پاسخ داده شده' } });
    return;
  }

  if (answer.questionNumber !== firstUnanswered.questionNumber) {
    return next(new AppError(`شما باید ابتدا به سوال ${firstUnanswered.questionNumber} پاسخ دهید`, 400));
  }

  const question = allQuestions.find(q => q.questionNumber === answer.questionNumber);
  session.answers.push({ questionId: question._id, answer: answer.value });
  await session.save();

  const remainingQuestions = allQuestions.filter(
    q => !answeredIds.has(q._id.toString()) && q.questionNumber !== answer.questionNumber
  );

  if (remainingQuestions.length === 0) {
    session.isCompleted = true;
    session.completedAt = new Date();
    await session.save();

    res.json({
      success: true,
      data: { completed: true, sessionId: session._id, redirect: `/result/${test.slug}/${session._id}` },
    });
    return;
  }

  const nextQ = remainingQuestions[0];

  res.json({
    success: true,
    data: {
      completed: false,
      question: {
        id: nextQ._id, questionNumber: nextQ.questionNumber,
        text: nextQ.text.fa, domain: nextQ.domain.fa,
        facet: { name: nextQ.facet.fa, code: nextQ.facet.code },
        isReversed: nextQ.isReversed,
        options: nextQ.options.map(o => ({ value: o.value, label: o.label.fa })),
      },
      progress: { answered: session.answers.length, total: allQuestions.length },
    },
  });
});

const submitAnswers = catchAsync(async (req, res, next) => {
  const { sessionId, answers } = req.body;

  const test = await Test.findOne({ slug: req.params.slug, isActive: true });
  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  let userId = null;
  let guestToken = null;
  if (req.tokenType === 'user') userId = req.user?._id;
  else if (req.tokenType === 'guest') guestToken = req.guest?.guestToken;

  const session = await TestSession.findOne({
    _id: sessionId, testId: test._id,
    ...(userId ? { userId } : { guestToken }),
  });

  if (!session) {
    return next(new AppError('جلسه یافت نشد', 404));
  }

  if (session.isCompleted) {
    return next(new AppError('این جلسه قبلاً تکمیل شده است', 400));
  }

  const questions = await Question.find({ testId: test._id, isActive: true });
  const questionIds = new Set(questions.map(q => q._id.toString()));

  for (const ans of answers) {
    if (!questionIds.has(ans.questionId)) {
      return next(new AppError(`سوال با شناسه ${ans.questionId} در این تست وجود ندارد`, 400));
    }
  }

  const existingAnswers = new Map(session.answers.map(a => [a.questionId.toString(), a]));
  for (const newAns of answers) {
    existingAnswers.set(newAns.questionId, { questionId: newAns.questionId, answer: newAns.answer });
  }

  session.answers = Array.from(existingAnswers.values());
  await session.save();

  const totalQuestions = questions.length;
  const answeredQuestions = session.answers.length;
  const isComplete = answeredQuestions >= totalQuestions;

  if (isComplete && !session.isCompleted) {
    session.isCompleted = true;
    session.completedAt = new Date();
    await session.save();
  }

  res.json({
    success: true,
    message: isComplete ? 'پاسخ‌ها ذخیره شد و آزمون تکمیل شد' : 'پاسخ‌ها ذخیره شد',
    data: { sessionId: session._id, answeredCount: answeredQuestions, totalQuestions, isComplete },
  });
});

const getSession = catchAsync(async (req, res, next) => {
  const test = await Test.findOne({ slug: req.params.slug, isActive: true });
  if (!test) {
    return next(new AppError('تست یافت نشد', 404));
  }

  const session = await TestSession.findOne({ _id: req.params.sessionId, testId: test._id });
  if (!session) {
    return next(new AppError('جلسه یافت نشد', 404));
  }

  let userId = null;
  let guestToken = null;
  if (req.tokenType === 'user') userId = req.user?._id;
  else if (req.tokenType === 'guest') guestToken = req.guest?.guestToken;

  const isOwner =
    (userId && session.userId?.toString() === userId.toString()) ||
    (guestToken && session.guestToken === guestToken);

  if (!isOwner) {
    return next(new AppError('دسترسی مجاز نیست', 403));
  }

  const questions = await Question.find({ testId: test._id, isActive: true });

  const answeredIds = new Set(session.answers.map(a => a.questionId.toString()));

  res.json({
    success: true,
    data: {
      sessionId: session._id, isCompleted: session.isCompleted,
      startedAt: session.startedAt, completedAt: session.completedAt,
      progress: { answered: session.answers.length, total: questions.length },
      answers: session.answers,
      lastAnsweredQuestion: answeredIds.size > 0
        ? Math.max(...session.answers.map(a => {
            const q = questions.find(qq => qq._id.toString() === a.questionId);
            return q ? q.questionNumber : 0;
          }))
        : 0,
    },
  });
});

module.exports = {
  getTests, getTestBySlug, getQuestions,
  checkIncompleteSession, createSession,
  getCurrentQuestion, submitOneAnswer, submitAnswers, getSession,
};
