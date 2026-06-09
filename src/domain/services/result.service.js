const Test = require('../../models/Test');
const TestSession = require('../../models/TestSession');
const Result = require('../../models/Result');
const Question = require('../../models/neo/Question');
const User = require('../../models/User');
const { scoreAssessment } = require('../../services/neoScoringEngine');
const AppError = require('../errors/AppError');

class ResultService {

  async getOrCreateResult(sessionId, slug, identity) {
    const test = await Test.findOne({ slug, isActive: true });
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');

    const session = await TestSession.findOne({ _id: sessionId, testId: test._id });
    if (!session) throw new AppError('جلسه یافت نشد', 404, 'SESSION_NOT_FOUND');

    if (!this._isOwner(session, identity)) {
      throw new AppError('دسترسی مجاز نیست', 403, 'FORBIDDEN');
    }

    const existing = await Result.findOne({ sessionId: session._id });
    if (existing) return { result: existing, isNew: false };

    const gender = await this._resolveGender(identity.userId);
    const userResponses = await this._buildUserResponses(session, test._id);
    const engineResult = scoreAssessment(userResponses, gender);

    const result = await Result.create({
      sessionId: session._id,
      testId: test._id,
      userId: identity.userId || undefined,
      guestToken: identity.guestToken || undefined,
      type: test.type,
      scores: engineResult,
      rawScores: engineResult,
      interpretation: engineResult,
      validity: engineResult.validity || { isValid: true, reason: '' },
    });

    return { result, isNew: true };
  }

  async getMyResults(identity, { testSlug, page, limit }) {
    const query = {};
    if (identity.userId) query.userId = identity.userId;
    else if (identity.guestToken) query.guestToken = identity.guestToken;

    if (testSlug) {
      const test = await Test.findOne({ slug: testSlug });
      if (test) query.testId = test._id;
    }

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Result.find(query)
        .populate('testId', 'slug title type')
        .populate('sessionId', 'isCompleted startedAt completedAt')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Result.countDocuments(query),
    ]);

    return {
      results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getIncompleteSessions(identity) {
    if (!identity.userId && !identity.guestToken) {
      throw new AppError('احراز هویت نشدید', 401, 'UNAUTHENTICATED');
    }

    const query = {};
    if (identity.userId) query.userId = identity.userId;
    else query.guestToken = identity.guestToken;

    const sessions = await TestSession.find({ ...query, isCompleted: false })
      .populate('testId', 'slug title type')
      .sort({ startedAt: -1 }).lean();

    const enriched = await Promise.all(sessions.map(async (s) => {
      const total = await Question.countDocuments({ testId: s.testId?._id, isActive: true });
      return {
        _id: s._id, testId: s.testId, startedAt: s.startedAt,
        answered: s.answers.length, total,
        progress: total > 0 ? Math.round((s.answers.length / total) * 100) : 0,
      };
    }));

    return { sessions: enriched };
  }

  async calculateScore(sessionId) {
    const session = await TestSession.findById(sessionId);
    if (!session) throw new AppError('جلسه یافت نشد', 404, 'SESSION_NOT_FOUND');

    const test = await Test.findById(session.testId);
    if (!test) throw new AppError('تست یافت نشد', 404, 'TEST_NOT_FOUND');

    const gender = await this._resolveGender(session.userId);
    const userResponses = await this._buildUserResponses(session, test._id);
    return scoreAssessment(userResponses, gender);
  }

  async shareResult(sessionId, identity) {
    const result = await Result.findOne({ sessionId });
    if (!result) throw new AppError('نتیجه یافت نشد', 404, 'RESULT_NOT_FOUND');

    if (identity.userId) {
      const session = await TestSession.findById(sessionId);
      if (!session || session.userId?.toString() !== identity.userId.toString()) {
        throw new AppError('دسترسی مجاز نیست', 403, 'FORBIDDEN');
      }
    }

    result.sharedWithAdmin = true;
    await result.save();
  }

  async deleteResult(id, identity) {
    const result = await Result.findById(id);
    if (!result) throw new AppError('نتیجه یافت نشد', 404, 'RESULT_NOT_FOUND');

    if (identity.userId) {
      if (result.userId?.toString() !== identity.userId.toString()) {
        throw new AppError('دسترسی مجاز نیست', 403, 'FORBIDDEN');
      }
    } else if (identity.guestToken) {
      if (result.guestToken !== identity.guestToken) {
        throw new AppError('دسترسی مجاز نیست', 403, 'FORBIDDEN');
      }
    }

    await Promise.all([
      TestSession.findByIdAndDelete(result.sessionId),
      Result.findByIdAndDelete(id),
    ]);
  }

  async getAdminSharedResults({ page, limit }) {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Result.find({ sharedWithAdmin: true })
        .populate('testId', 'slug title type')
        .populate('sessionId', 'isCompleted startedAt completedAt')
        .populate('userId', 'fullName email gender')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Result.countDocuments({ sharedWithAdmin: true }),
    ]);

    const enriched = results.map(r => ({
      ...r,
      validityBadge: r.validity?.isValid === false
        ? { label: 'پاسخنامه بی‌اعتبار', color: 'red' }
        : { label: 'معتبر', color: 'green' },
    }));

    return {
      results: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // --- helpers ---

  _isOwner(session, identity) {
    return (
      (identity.userId && session.userId?.toString() === identity.userId.toString()) ||
      (identity.guestToken && session.guestToken === identity.guestToken)
    );
  }

  async _resolveGender(userId) {
    if (!userId) return 'مرد';
    const user = await User.findById(userId);
    return user?.gender || 'مرد';
  }

  async _buildUserResponses(session, testId) {
    const questions = await Question.find({ testId, isActive: true });
    const numMap = {};
    questions.forEach(q => { numMap[q._id.toString()] = q.questionNumber; });

    const userResponses = {};
    session.answers.forEach(a => {
      const qNum = numMap[a.questionId.toString()];
      if (qNum) userResponses[qNum] = a.answer;
    });

    return userResponses;
  }
}

module.exports = new ResultService();
