const Test = require('../models/Test');
const TestSession = require('../models/TestSession');
const Result = require('../models/Result');
const Question = require('../models/neo/Question');
const User = require('../models/User');
const { scoreAssessment } = require('../services/neoScoringEngine');
const AppError = require('../utils/AppError');

const getResult = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const test = await Test.findOne({ slug: req.params.slug, isActive: true });
    if (!test) {
      return next(new AppError('تست یافت نشد', 404));
    }

    const session = await TestSession.findOne({ _id: sessionId, testId: test._id });
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

    const existingResult = await Result.findOne({ sessionId: session._id });
    if (existingResult) {
      const resultObj = existingResult.toObject();
      const { validity, ...safeResult } = resultObj;
      res.json({ success: true, message: 'نتیجه از قبل محاسبه شده', data: safeResult });
      return;
    }

    const questions = await Question.find({ testId: test._id, isActive: true });

    let gender = 'مرد';
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.gender) gender = user.gender;
    }

    const questionNumMap = {};
    questions.forEach(q => { questionNumMap[q._id.toString()] = q.questionNumber; });

    const userResponses = {};
    session.answers.forEach(a => {
      const qNum = questionNumMap[a.questionId.toString()];
      if (qNum) userResponses[qNum] = a.answer;
    });

    const engineResult = scoreAssessment(userResponses, gender);

    const result = await Result.create({
      sessionId: session._id,
      testId: test._id,
      userId: userId || undefined,
      guestToken: guestToken || undefined,
      type: test.type,
      scores: engineResult,
      rawScores: engineResult,
      interpretation: engineResult,
      validity: engineResult.validity || { isValid: true, reason: '' },
    });

    const resultObj = result.toObject();
    const { validity, ...safeResult } = resultObj;

    res.json({ success: true, message: 'نتیجه با موفقیت محاسبه شد', data: safeResult });
  } catch (error) {
    next(error);
  }
};

const getMyResults = async (req, res, next) => {
  try {
    const { testSlug, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (req.tokenType === 'user') {
      query.userId = req.user?._id;
    } else if (req.tokenType === 'guest') {
      query.guestToken = req.guest?.guestToken;
    }

    if (testSlug) {
      const test = await Test.findOne({ slug: testSlug });
      if (test) query.testId = test._id;
    }

    const results = await Result.find(query)
      .populate('testId', 'slug title type')
      .populate('sessionId', 'isCompleted startedAt completedAt')
      .sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();

    const cleanedResults = results.map(r => {
      const { validity, ...rest } = r;
      return rest;
    });

    const total = await Result.countDocuments(query);

    res.json({
      success: true,
      data: {
        results: cleanedResults,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getIncompleteSessions = async (req, res, next) => {
  try {
    const query = {};
    if (req.tokenType === 'user') {
      query.userId = req.user?._id;
    } else if (req.tokenType === 'guest') {
      query.guestToken = req.guest?.guestToken;
    } else {
      return next(new AppError('احراز هویت نشدید', 401));
    }

    const sessions = await TestSession.find({ ...query, isCompleted: false })
      .populate('testId', 'slug title type')
      .sort({ startedAt: -1 }).lean();

    const enriched = await Promise.all(sessions.map(async s => {
      const total = await Question.countDocuments({ testId: s.testId?._id, isActive: true });
      return {
        _id: s._id, testId: s.testId, startedAt: s.startedAt,
        answered: s.answers.length, total,
        progress: total > 0 ? Math.round((s.answers.length / total) * 100) : 0,
      };
    }));

    res.json({ success: true, data: { sessions: enriched } });
  } catch (error) {
    next(error);
  }
};

const calculateScore = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new AppError('sessionId الزامی است', 400));
    }

    const session = await TestSession.findById(sessionId);
    if (!session) {
      return next(new AppError('جلسه یافت نشد', 404));
    }

    const test = await Test.findById(session.testId);
    if (!test) {
      return next(new AppError('تست یافت نشد', 404));
    }

    const questions = await Question.find({ testId: test._id, isActive: true });
    const questionNumMap = {};
    questions.forEach(q => { questionNumMap[q._id.toString()] = q.questionNumber; });

    let gender = 'مرد';
    if (session.userId) {
      const user = await User.findById(session.userId);
      if (user && user.gender) gender = user.gender;
    }

    const userResponses = {};
    session.answers.forEach(a => {
      const qNum = questionNumMap[a.questionId.toString()];
      if (qNum) userResponses[qNum] = a.answer;
    });

    const engineResult = scoreAssessment(userResponses, gender);

    res.json({ success: true, data: engineResult });
  } catch (error) {
    next(error);
  }
};

const shareResult = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new AppError('sessionId الزامی است', 400));
    }

    const result = await Result.findOne({ sessionId });
    if (!result) {
      return next(new AppError('نتیجه یافت نشد', 404));
    }

    if (req.tokenType === 'user') {
      const session = await TestSession.findById(sessionId);
      if (!session || session.userId?.toString() !== req.user?._id.toString()) {
        return next(new AppError('دسترسی مجاز نیست', 403));
      }
    }

    result.sharedWithAdmin = true;
    await result.save();

    res.json({ success: true, message: 'نتیجه با موفقیت برای مدیر ارسال شد' });
  } catch (error) {
    next(error);
  }
};

const deleteResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await Result.findById(id);
    if (!result) {
      return next(new AppError('نتیجه یافت نشد', 404));
    }

    if (req.tokenType === 'user') {
      if (result.userId?.toString() !== req.user?._id.toString()) {
        return next(new AppError('دسترسی مجاز نیست', 403));
      }
    } else if (req.tokenType === 'guest') {
      if (result.guestToken !== req.guest?.guestToken) {
        return next(new AppError('دسترسی مجاز نیست', 403));
      }
    }

    await TestSession.findByIdAndDelete(result.sessionId);
    await Result.findByIdAndDelete(id);

    res.json({ success: true, message: 'نتیجه با موفقیت حذف شد' });
  } catch (error) {
    next(error);
  }
};

const getAdminSharedResults = async (req, res, next) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const results = await Result.find({ sharedWithAdmin: true })
      .populate('testId', 'slug title type')
      .populate('sessionId', 'isCompleted startedAt completedAt')
      .populate('userId', 'fullName email gender')
      .sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();

    const total = await Result.countDocuments({ sharedWithAdmin: true });

    const enrichedResults = results.map(r => ({
      ...r,
      validityBadge: r.validity?.isValid === false
        ? { label: 'پاسخنامه بی‌اعتبار', color: 'red' }
        : { label: 'معتبر', color: 'green' },
    }));

    res.json({
      success: true,
      data: {
        results: enrichedResults,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResult, getMyResults, getIncompleteSessions,
  calculateScore, shareResult, deleteResult, getAdminSharedResults,
};
