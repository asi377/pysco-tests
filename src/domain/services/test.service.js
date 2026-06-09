const Test = require('../../models/Test');
const Question = require('../../models/neo/Question');
const TestSession = require('../../models/TestSession');
const AppError = require('../errors/AppError');

class TestService {

  async getTests(page, limit) {
    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([
      Test.find({ isActive: true })
        .select('slug title type description duration totalQuestions')
        .skip(skip).limit(limit).lean(),
      Test.countDocuments({ isActive: true }),
    ]);

    return { tests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getTestBySlug(slug) {
    const test = await Test.findOne({ slug, isActive: true });
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');
    return test;
  }

  async getQuestions(slug, lang, page, limit) {
    const test = await Test.findOne({ slug, isActive: true });
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');

    const skip = (page - 1) * limit;

    const [totalCount, questions] = await Promise.all([
      Question.countDocuments({ testId: test._id, isActive: true }),
      Question.find({ testId: test._id, isActive: true })
        .sort({ questionNumber: 1 }).skip(skip).limit(limit).lean(),
    ]);

    const formatted = questions.map(q => ({
      id: q._id, questionNumber: q.questionNumber,
      text: lang === 'en' ? q.text.en : q.text.fa,
      domain: lang === 'en' ? q.domain.en : q.domain.fa,
      facet: { name: lang === 'en' ? q.facet.en : q.facet.fa, code: q.facet.code },
      isReversed: q.isReversed,
      options: q.options.map(o => ({ value: o.value, label: lang === 'en' ? o.label.en : o.label.fa })),
    }));

    return {
      testId: test._id, slug: test.slug, totalQuestions: totalCount,
      questions: formatted,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
    };
  }

  async checkIncompleteSession(slug, identity) {
    const test = await Test.findOne({ slug, isActive: true });
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');

    if (!identity.userId && !identity.guestToken) {
      return { session: null };
    }

    const query = { testId: test._id, isCompleted: false };
    if (identity.userId) query.userId = identity.userId;
    else query.guestToken = identity.guestToken;

    const session = await TestSession.findOne(query).populate('testId', 'slug title type');
    if (!session) return { session: null };

    const questions = await Question.countDocuments({ testId: test._id, isActive: true });

    return {
      session: {
        _id: session._id, testId: session.testId,
        startedAt: session.startedAt,
        answered: session.answers.length,
        total: questions,
        progress: Math.round((session.answers.length / questions) * 100),
      },
    };
  }

  async createOrResumeSession(slug, identity, forceNew) {
    if (!identity.userId && !identity.guestToken) {
      throw new AppError('لطفاً وارد شوید یا به عنوان مهمان ادامه دهید', 401, 'UNAUTHENTICATED');
    }

    const test = await Test.findOne({ slug, isActive: true });
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');

    if (!forceNew) {
      const query = { testId: test._id, isCompleted: false };
      if (identity.userId) query.userId = identity.userId;
      else query.guestToken = identity.guestToken;

      const existing = await TestSession.findOne(query);
      if (existing) {
        return { sessionId: existing._id, resumed: true };
      }
    }

    const sessionData = { testId: test._id };
    if (identity.userId) sessionData.userId = identity.userId;
    if (identity.guestToken) sessionData.guestToken = identity.guestToken;

    const session = await TestSession.create(sessionData);
    return { sessionId: session._id, resumed: false };
  }

  async getCurrentQuestion(slug, sessionId, identity) {
    const test = await this._findTest(slug);

    const query = { _id: sessionId, testId: test._id };
    if (identity.userId) query.userId = identity.userId;
    else if (identity.guestToken) query.guestToken = identity.guestToken;

    const session = await TestSession.findOne(query);
    if (!session) throw new AppError('جلسه یافت نشد', 404, 'SESSION_NOT_FOUND');

    const allQuestions = await Question.find({ testId: test._id, isActive: true })
      .sort({ questionNumber: 1 }).lean();

    const answeredIds = new Set(session.answers.map(a => a.questionId.toString()));
    const nextQuestion = allQuestions.find(q => !answeredIds.has(q._id.toString()));

    if (!nextQuestion) {
      return { completed: true, message: 'همه سوالات پاسخ داده شده' };
    }

    return {
      completed: false,
      question: {
        id: nextQuestion._id, questionNumber: nextQuestion.questionNumber,
        text: nextQuestion.text.fa,
        domain: nextQuestion.domain.fa,
        facet: { name: nextQuestion.facet.fa, code: nextQuestion.facet.code },
        isReversed: nextQuestion.isReversed,
        options: nextQuestion.options.map(o => ({ value: o.value, label: o.label.fa })),
      },
      progress: { answered: session.answers.length, total: allQuestions.length },
    };
  }

  async submitOneAnswer(slug, sessionId, answer, identity) {
    const test = await this._findTest(slug);

    const query = { _id: sessionId, testId: test._id };
    if (identity.userId) query.userId = identity.userId;
    else if (identity.guestToken) query.guestToken = identity.guestToken;

    const session = await TestSession.findOne(query);
    if (!session) throw new AppError('جلسه یافت نشد', 404, 'SESSION_NOT_FOUND');
    if (session.isCompleted) throw new AppError('این جلسه قبلاً تکمیل شده است', 400, 'SESSION_COMPLETED');

    const allQuestions = await Question.find({ testId: test._id, isActive: true })
      .sort({ questionNumber: 1 }).lean();

    const answeredIds = new Set(session.answers.map(a => a.questionId.toString()));
    const firstUnanswered = allQuestions.find(q => !answeredIds.has(q._id.toString()));

    if (!firstUnanswered) {
      return { completed: true, message: 'همه سوالات قبلاً پاسخ داده شده', sessionId: session._id };
    }

    if (answer.questionNumber !== firstUnanswered.questionNumber) {
      throw new AppError(`شما باید ابتدا به سوال ${firstUnanswered.questionNumber} پاسخ دهید`, 400, 'WRONG_ORDER');
    }

    const question = allQuestions.find(q => q.questionNumber === answer.questionNumber);
    session.answers.push({ questionId: question._id, answer: answer.value });

    const nextUnanswered = allQuestions.find(
      q => !answeredIds.has(q._id.toString()) && q.questionNumber !== answer.questionNumber,
    );

    if (!nextUnanswered) {
      session.isCompleted = true;
      session.completedAt = new Date();
      await session.save();
      return { completed: true, sessionId: session._id, redirect: `/result/${test.slug}/${session._id}` };
    }

    await session.save();

    return {
      completed: false,
      question: {
        id: nextUnanswered._id, questionNumber: nextUnanswered.questionNumber,
        text: nextUnanswered.text.fa, domain: nextUnanswered.domain.fa,
        facet: { name: nextUnanswered.facet.fa, code: nextUnanswered.facet.code },
        isReversed: nextUnanswered.isReversed,
        options: nextUnanswered.options.map(o => ({ value: o.value, label: o.label.fa })),
      },
      progress: { answered: session.answers.length, total: allQuestions.length },
    };
  }

  async submitAnswers(slug, sessionId, answers, identity) {
    const test = await this._findTest(slug);

    const query = { _id: sessionId, testId: test._id };
    if (identity.userId) query.userId = identity.userId;
    else if (identity.guestToken) query.guestToken = identity.guestToken;

    const session = await TestSession.findOne(query);
    if (!session) throw new AppError('جلسه یافت نشد', 404, 'SESSION_NOT_FOUND');
    if (session.isCompleted) throw new AppError('این جلسه قبلاً تکمیل شده است', 400, 'SESSION_COMPLETED');

    const questions = await Question.find({ testId: test._id, isActive: true });
    const questionIds = new Set(questions.map(q => q._id.toString()));

    for (const ans of answers) {
      if (!questionIds.has(ans.questionId)) {
        throw new AppError(`سوال با شناسه ${ans.questionId} در این تست وجود ندارد`, 400, 'INVALID_QUESTION');
      }
    }

    const existingAnswers = new Map(session.answers.map(a => [a.questionId.toString(), a]));
    for (const newAns of answers) {
      existingAnswers.set(newAns.questionId, { questionId: newAns.questionId, answer: newAns.answer });
    }

    session.answers = Array.from(existingAnswers.values());

    const answeredCount = session.answers.length;
    const totalQuestions = questions.length;
    const isComplete = answeredCount >= totalQuestions;

    if (isComplete) {
      session.isCompleted = true;
      session.completedAt = new Date();
    }

    await session.save();

    return { sessionId: session._id, answeredCount, totalQuestions, isComplete };
  }

  async getSession(slug, sessionId, identity) {
    const test = await this._findTest(slug);

    const session = await TestSession.findOne({ _id: sessionId, testId: test._id });
    if (!session) throw new AppError('جلسه یافت نشد', 404, 'SESSION_NOT_FOUND');

    if (!this._isOwner(session, identity)) {
      throw new AppError('دسترسی مجاز نیست', 403, 'FORBIDDEN');
    }

    const questions = await Question.find({ testId: test._id, isActive: true });
    const answeredIds = new Set(session.answers.map(a => a.questionId.toString()));

    const lastAnsweredNumber = answeredIds.size > 0
      ? Math.max(...session.answers.map(a => {
          const q = questions.find(qq => qq._id.toString() === a.questionId);
          return q ? q.questionNumber : 0;
        }))
      : 0;

    return {
      sessionId: session._id, isCompleted: session.isCompleted,
      startedAt: session.startedAt, completedAt: session.completedAt,
      progress: { answered: session.answers.length, total: questions.length },
      answers: session.answers,
      lastAnsweredQuestion: lastAnsweredNumber,
    };
  }

  // --- helpers ---

  async _findTest(slug) {
    const test = await Test.findOne({ slug, isActive: true });
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');
    return test;
  }

  _isOwner(session, identity) {
    return (
      (identity.userId && session.userId?.toString() === identity.userId.toString()) ||
      (identity.guestToken && session.guestToken === identity.guestToken)
    );
  }
}

module.exports = new TestService();
