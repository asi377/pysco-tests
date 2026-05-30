const Test = require('../models/Test');
const TestSession = require('../models/TestSession');
const Result = require('../models/Result');
const Question = require('../models/neo/Question');
const User = require('../models/User');
const { scoreAssessment } = require('../services/neoScoringEngine');

const getResult = async (req, res) => {
  try {
    const { sessionId } = req.params;

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
      _id: sessionId,
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

    const existingResult = await Result.findOne({ sessionId: session._id });
    if (existingResult) {
      const resultObj = existingResult.toObject();
      const { validity, ...safeResult } = resultObj;
      res.json({
        success: true,
        message: 'نتیجه از قبل محاسبه شده',
        data: safeResult,
      });
      return;
    }

    const questions = await Question.find({
      testId: test._id,
      isActive: true,
    });

    let gender = 'مرد';
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.gender) gender = user.gender;
    }

    const questionNumMap = {};
    questions.forEach(q => {
      questionNumMap[q._id.toString()] = q.questionNumber;
    });

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

    res.json({
      success: true,
      message: 'نتیجه با موفقیت محاسبه شد',
      data: safeResult,
    });
  } catch (error) {
    console.error('Result calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const getMyResults = async (req, res) => {
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
      if (test) {
        query.testId = test._id;
      }
    }

    const results = await Result.find(query)
      .populate('testId', 'slug title type')
      .populate('sessionId', 'isCompleted startedAt completedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const cleanedResults = results.map(r => {
      const { validity, ...rest } = r;
      return rest;
    });

    const total = await Result.countDocuments(query);

    res.json({
      success: true,
      data: {
        results: cleanedResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
    });
  }
};

const getIncompleteSessions = async (req, res) => {
  try {
    const query = {};
    if (req.tokenType === 'user') {
      query.userId = req.user?._id;
    } else if (req.tokenType === 'guest') {
      query.guestToken = req.guest?.guestToken;
    } else {
      res.status(401).json({ success: false, message: 'احراز هویت نشدید' });
      return;
    }

    const sessions = await TestSession.find({ ...query, isCompleted: false })
      .populate('testId', 'slug title type')
      .sort({ startedAt: -1 })
      .lean();

    const enriched = await Promise.all(sessions.map(async (s) => {
      const total = await Question.countDocuments({ testId: s.testId?._id, isActive: true });
      return {
        _id: s._id,
        testId: s.testId,
        startedAt: s.startedAt,
        answered: s.answers.length,
        total,
        progress: total > 0 ? Math.round((s.answers.length / total) * 100) : 0,
      };
    }));

    res.json({ success: true, data: { sessions: enriched } });
  } catch (error) {
    console.error('Incomplete sessions fetch error:', error);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
};

const calculateScore = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId الزامی است' });
      return;
    }

    const session = await TestSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'جلسه یافت نشد' });
      return;
    }

    const test = await Test.findById(session.testId);
    if (!test) {
      res.status(404).json({ success: false, message: 'تست یافت نشد' });
      return;
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
    console.error('Calculate score error:', error);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
};

const shareResult = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId الزامی است' });
      return;
    }

    const result = await Result.findOne({ sessionId });

    if (!result) {
      res.status(404).json({ success: false, message: 'نتیجه یافت نشد' });
      return;
    }

    if (req.tokenType === 'user') {
      const session = await TestSession.findById(sessionId);
      if (!session || session.userId?.toString() !== req.user?._id.toString()) {
        res.status(403).json({ success: false, message: 'دسترسی مجاز نیست' });
        return;
      }
    }

    result.sharedWithAdmin = true;
    await result.save();

    res.json({ success: true, message: 'نتیجه با موفقیت برای مدیر ارسال شد' });
  } catch (error) {
    console.error('Share result error:', error);
    res.status(500).json({ success: false, message: 'خطا در ارسال نتیجه' });
  }
};

const deleteResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findById(id);
    if (!result) {
      res.status(404).json({ success: false, message: 'نتیجه یافت نشد' });
      return;
    }

    if (req.tokenType === 'user') {
      if (result.userId?.toString() !== req.user?._id.toString()) {
        res.status(403).json({ success: false, message: 'دسترسی مجاز نیست' });
        return;
      }
    } else if (req.tokenType === 'guest') {
      if (result.guestToken !== req.guest?.guestToken) {
        res.status(403).json({ success: false, message: 'دسترسی مجاز نیست' });
        return;
      }
    }

    await TestSession.findByIdAndDelete(result.sessionId);
    await Result.findByIdAndDelete(id);

    res.json({ success: true, message: 'نتیجه با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({ success: false, message: 'خطا در حذف نتیجه' });
  }
};

const getAdminSharedResults = async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const results = await Result.find({ sharedWithAdmin: true })
      .populate('testId', 'slug title type')
      .populate('sessionId', 'isCompleted startedAt completedAt')
      .populate('userId', 'fullName email gender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

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
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Admin shared results error:', error);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
};

module.exports = { getResult, getMyResults, getIncompleteSessions, calculateScore, shareResult, deleteResult, getAdminSharedResults };
