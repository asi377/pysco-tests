const express = require('express');
const Test = require('../models/Test');
const Question = require('../models/neo/Question');
const TestSession = require('../models/TestSession');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const { sessionValidator, answerValidator } = require('../middlewares/validator');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const tests = await Test.find({ isActive: true }).select(
            'slug title type description duration totalQuestions',
        );

        res.json({
            success: true,
            data: tests,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطای سرور',
        });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const test = await Test.findOne({
            slug: req.params.slug,
            isActive: true,
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'تست یافت نشد',
            });
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
});

router.get('/:slug/questions', async (req, res) => {
    try {
        const test = await Test.findOne({
            slug: req.params.slug,
            isActive: true,
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'تست یافت نشد',
            });
        }

        const lang = req.query.lang || 'fa';

        const questions = await Question.find({
            testId: test._id,
            isActive: true,
        }).sort({ questionNumber: 1 });

        const formattedQuestions = questions.map((q) => ({
            id: q._id,
            questionNumber: q.questionNumber,
            text: lang === 'en' ? q.text.en : q.text.fa,
            domain: lang === 'en' ? q.domain.en : q.domain.fa,
            facet: {
                name: lang === 'en' ? q.facet.en : q.facet.fa,
                code: q.facet.code,
            },
            isReversed: q.isReversed,
            options: q.options.map((o) => ({
                value: o.value,
                label: lang === 'en' ? o.label.en : o.label.fa,
            })),
        }));

        res.json({
            success: true,
            data: {
                testId: test._id,
                slug: test.slug,
                totalQuestions: formattedQuestions.length,
                questions: formattedQuestions,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطای سرور',
        });
    }
});

router.post(
    '/:slug/session',
    optionalAuth,
    sessionValidator,
    async (req, res) => {
        try {
            const test = await Test.findOne({
                slug: req.params.slug,
                isActive: true,
            });

            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: 'تست یافت نشد',
                });
            }

            let userId = null;
            let guestToken = null;

            if (req.tokenType === 'user') {
                userId = req.user._id;
            } else if (req.tokenType === 'guest') {
                guestToken = req.guest.guestToken;
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'لطفاً وارد شوید یا به عنوان مهمان ادامه دهید',
                });
            }

            const existingSession = await TestSession.findOne({
                userId: userId || undefined,
                guestToken: guestToken || undefined,
                testId: test._id,
                isCompleted: false,
            });

            if (existingSession) {
                return res.json({
                    success: true,
                    message: 'جلسه فعال موجود بازیابی شد',
                    data: {
                        sessionId: existingSession._id,
                        resumed: true,
                    },
                });
            }

            const session = await TestSession.create({
                userId,
                guestToken,
                testId: test._id,
            });

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
    },
);

router.post(
    '/:slug/answers',
    optionalAuth,
    answerValidator,
    async (req, res) => {
        try {
            const { sessionId, answers } = req.body;

            const test = await Test.findOne({
                slug: req.params.slug,
                isActive: true,
            });

            if (!test) {
                return res.status(404).json({
                    success: false,
                    message: 'تست یافت نشد',
                });
            }

            let userId = null;
            let guestToken = null;

            if (req.tokenType === 'user') {
                userId = req.user._id;
            } else if (req.tokenType === 'guest') {
                guestToken = req.guest.guestToken;
            }

            const session = await TestSession.findOne({
                _id: sessionId,
                testId: test._id,
                ...(userId ? { userId } : { guestToken }),
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'جلسه یافت نشد',
                });
            }

            if (session.isCompleted) {
                return res.status(400).json({
                    success: false,
                    message: 'این جلسه قبلاً تکمیل شده است',
                });
            }

            const questions = await Question.find({
                testId: test._id,
                isActive: true,
            });

            const questionIds = new Set(questions.map((q) => q._id.toString()));

            for (const ans of answers) {
                if (!questionIds.has(ans.questionId)) {
                    return res.status(400).json({
                        success: false,
                        message: `سوال با شناسه ${ans.questionId} در این تست وجود ندارد`,
                    });
                }
            }

            const existingAnswers = new Map(
                session.answers.map((a) => [a.questionId.toString(), a]),
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
    },
);

router.get('/:slug/session/:sessionId', optionalAuth, async (req, res) => {
    try {
        const test = await Test.findOne({
            slug: req.params.slug,
            isActive: true,
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'تست یافت نشد',
            });
        }

        const session = await TestSession.findOne({
            _id: req.params.sessionId,
            testId: test._id,
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'جلسه یافت نشد',
            });
        }

        let userId = null;
        let guestToken = null;

        if (req.tokenType === 'user') {
            userId = req.user._id;
        } else if (req.tokenType === 'guest') {
            guestToken = req.guest.guestToken;
        }

        const isOwner =
            (userId && session.userId?.toString() === userId.toString()) ||
            (guestToken && session.guestToken === guestToken);

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی مجاز نیست',
            });
        }

        const questions = await Question.find({
            testId: test._id,
            isActive: true,
        });

        const answeredIds = new Set(
            session.answers.map((a) => a.questionId.toString()),
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
                    const q = questions.find(q => q._id.toString() === a.questionId);
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
});

module.exports = router;