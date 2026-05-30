const Test = require('../models/Test');
const Question = require('../models/neo/Question');
const TestSession = require('../models/TestSession');

const getTests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tests = await Test.find({ isActive: true })
      .select('slug title type description duration totalQuestions')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Test.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        tests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const getTestBySlug = async (req, res) => {
  try {
    const test = await Test.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'تست یافت نشد',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: test._id,
        slug: test.slug,
        title: test.title,
        type: test.type,
        description: test.description,
        duration: test.duration,
        totalQuestions: test.totalQuestions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const getQuestions = async (req, res) => {
  try {
    const test = await Test.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'تست یافت نشد',
      });
      return;
    }

    const lang = req.query.lang || 'fa';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const totalCount = await Question.countDocuments({
      testId: test._id,
      isActive: true,
    });

    const questions = await Question.find({
      testId: test._id,
      isActive: true,
    })
      .sort({ questionNumber: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedQuestions = questions.map(q => ({
      id: q._id,
      questionNumber: q.questionNumber,
      text: lang === 'en' ? q.text.en : q.text.fa,
      domain: lang === 'en' ? q.domain.en : q.domain.fa,
      facet: {
        name: lang === 'en' ? q.facet.en : q.facet.fa,
        code: q.facet.code,
      },
      isReversed: q.isReversed,
      options: q.options.map(o => ({
        value: o.value,
        label: lang === 'en' ? o.label.en : o.label.fa,
      })),
    }));

    res.json({
      success: true,
      data: {
        testId: test._id,
        slug: test.slug,
        totalQuestions: totalCount,
        questions: formattedQuestions,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const checkIncompleteSession = async (req, res) => {
  try {
    const test = await Test.findOne({ slug: req.params.slug, isActive: true });
    if (!test) {
      res.status(404).json({ success: false, message: 'تست یافت نشد' });
      return;
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
      testId: test._id,
      isCompleted: false,
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
          _id: existingSession._id,
          testId: existingSession.testId,
          startedAt: existingSession.startedAt,
          answered: existingSession.answers.length,
          total: questions,
          progress: Math.round((existingSession.answers.length / questions) * 100),
        },
      },
    });
  } catch (error) {
    console.error('Check incomplete session error:', error);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
};

const createSession = async (req, res) => {
  try {
    const test = await Test.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'تست یافت نشد',
      });
      return;
    }

    let userId = null;
    let guestToken = null;

    if (req.tokenType === 'user') {
      userId = req.user?._id;
    } else if (req.tokenType === 'guest') {
      guestToken = req.guest?.guestToken;
    } else {
      res.status(401).json({
        success: false,
        message: 'لطفاً وارد شوید یا به عنوان مهمان ادامه دهید',
      });
      return;
    }

    if (!req.body.forceNew) {
      const existingSession = await TestSession.findOne({
        ...(userId ? { userId } : { guestToken }),
        testId: test._id,
        isCompleted: false,
      });

      if (existingSession) {
        res.json({
          success: true,
          message: 'جلسه فعال موجود بازیابی شد',
          data: {
            sessionId: existingSession._id,
            resumed: true,
          },
        });
        return;
      }
    }

    const sessionData = {
      testId: test._id,
    };
    
    if (userId) sessionData.userId = userId;
    if (guestToken) sessionData.guestToken = guestToken;
    
    const session = await TestSession.create(sessionData);

    res.status(201).json({
      success: true,
      message: 'جلسه تست ایجاد شد',
      data: {
        sessionId: session._id,
        resumed: false,
      },
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const submitAnswers = async (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    const test = await Test.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'تست یافت نشد',
      });
      return;
    }

    let userId = null;
    let guestToken = null;

    if (req.tokenType === 'user') {
      userId = req.user?._id;
    } else if (req.tokenType === 'guest') {
      guestToken = req.guest?.guestToken;
    }

    const session = await TestSession.findOne({
      _id: sessionId,
      testId: test._id,
      ...(userId ? { userId } : { guestToken }),
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'جلسه یافت نشد',
      });
      return;
    }

    if (session.isCompleted) {
      res.status(400).json({
        success: false,
        message: 'این جلسه قبلاً تکمیل شده است',
      });
      return;
    }

    console.log('Submitting answers for session:', sessionId);
    console.log('Received answers count:', answers?.length);

    const questions = await Question.find({
      testId: test._id,
      isActive: true,
    });

    const questionIds = new Set(questions.map(q => q._id.toString()));

    for (const ans of answers) {
      if (!questionIds.has(ans.questionId)) {
        res.status(400).json({
          success: false,
          message: `سوال با شناسه ${ans.questionId} در این تست وجود ندارد`,
        });
        return;
      }
    }

    const existingAnswers = new Map(
      session.answers.map(a => [a.questionId.toString(), a])
    );

    for (const newAns of answers) {
      existingAnswers.set(newAns.questionId, {
        questionId: newAns.questionId,
        answer: newAns.answer,
      });
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
      message: isComplete
        ? 'پاسخ‌ها ذخیره شد و آزمون تکمیل شد'
        : 'پاسخ‌ها ذخیره شد',
      data: {
        sessionId: session._id,
        answeredCount: answeredQuestions,
        totalQuestions,
        isComplete,
      },
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const getSession = async (req, res) => {
  try {
    const test = await Test.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'تست یافت نشد',
      });
      return;
    }

    const session = await TestSession.findOne({
      _id: req.params.sessionId,
      testId: test._id,
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'جلسه یافت نشد',
      });
      return;
    }

    let userId = null;
    let guestToken = null;

    if (req.tokenType === 'user') {
      userId = req.user?._id;
    } else if (req.tokenType === 'guest') {
      guestToken = req.guest?.guestToken;
    }

    const isOwner =
      (userId && session.userId?.toString() === userId.toString()) ||
      (guestToken && session.guestToken === guestToken);

    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: 'دسترسی مجاز نیست',
      });
      return;
    }

    const questions = await Question.find({
      testId: test._id,
      isActive: true,
    });

    const answeredIds = new Set(
      session.answers.map(a => a.questionId.toString())
    );

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        isCompleted: session.isCompleted,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        progress: {
          answered: session.answers.length,
          total: questions.length,
        },
        answers: session.answers,
        lastAnsweredQuestion: answeredIds.size > 0 ? Math.max(...session.answers.map(a => {
          const q = questions.find(qq => qq._id.toString() === a.questionId);
          return q ? q.questionNumber : 0;
        })) : 0,
      },
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

module.exports = {
  getTests,
  getTestBySlug,
  getQuestions,
  checkIncompleteSession,
  createSession,
  submitAnswers,
  getSession,
};