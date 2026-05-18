const express = require('express');
const Test = require('../models/Test');
const TestSession = require('../models/TestSession');
const Result = require('../models/Result');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

const calculatePercentile = (rawScore, maxScore) => {
    const percentage = (rawScore / maxScore) * 100;
    if (percentage >= 75) return { level: 'بالا', value: Math.round(percentage) };
    if (percentage >= 50) return { level: 'متوسط به بالا', value: Math.round(percentage) };
    if (percentage >= 25) return { level: 'متوسط', value: Math.round(percentage) };
    return { level: 'پایین', value: Math.round(percentage) };
};

const interpretNEO = (scores) => {
    const interpretations = {};

    const domainNames = {
        N: {
            fa: 'روان\u200Cنژندی',
            en: 'Neuroticism',
            desc: {
                fa: 'میزان ثبات هیجانی و توانایی مقابله با استرس',
                en: 'Level of emotional stability and stress management',
            },
        },
        E: {
            fa: 'برون\u200Cگرایی',
            en: 'Extraversion',
            desc: {
                fa: 'میزان انرژی\u200Cگرایی و تعامل اجتماعی',
                en: 'Level of assertiveness and social interaction',
            },
        },
        O: {
            fa: 'گشودگی به تجربه',
            en: 'Openness',
            desc: {
                fa: 'میزان علاقه به تجربه\u200Cهای جدید و تفکر خلاقانه',
                en: 'Level of curiosity and creative thinking',
            },
        },
        A: {
            fa: 'توافق\u200Cپذیری',
            en: 'Agreeableness',
            desc: {
                fa: 'میزان همکاری و اعتماد به دیگران',
                en: 'Level of cooperation and trust in others',
            },
        },
        C: {
            fa: 'وظیفه\u200Cشناسی',
            en: 'Conscientiousness',
            desc: {
                fa: 'میزان سازمان\u200Cدهی و مسئولیت\u200Cپذیری',
                en: 'Level of organization and responsibility',
            },
        },
    };

    const facetDescriptions = {
        N1: { fa: 'اضطراب', en: 'Anxiety' },
        N2: { fa: 'خشم و پرخاشگری', en: 'Angry Hostility' },
        N3: { fa: 'افسردگی', en: 'Depression' },
        N4: { fa: 'کمرویی', en: 'Self-Consciousness' },
        N5: { fa: 'تکانش\u200Cوری', en: 'Impulsiveness' },
        N6: { fa: 'آسیب\u200Cپذیری از استرس', en: 'Vulnerability' },
        E1: { fa: 'صمیمیت', en: 'Warmth' },
        E2: { fa: 'جمع\u200Cگرایی', en: 'Gregariousness' },
        E3: { fa: 'قاطعیت', en: 'Assertiveness' },
        E4: { fa: 'فعالیت', en: 'Activity' },
        E5: { fa: 'هیجان\u200Cخواهی', en: 'Excitement-Seeking' },
        E6: { fa: 'هیجانات مثبت', en: 'Positive Emotions' },
        O1: { fa: 'تخیل', en: 'Fantasy' },
        O2: { fa: 'زیباشناسی', en: 'Aesthetics' },
        O3: { fa: 'عواطف', en: 'Feelings' },
        O4: { fa: 'اعمال', en: 'Actions' },
        O5: { fa: 'نظرات', en: 'Ideas' },
        O6: { fa: 'ارزش\u200Cها', en: 'Values' },
        A1: { fa: 'اعتماد', en: 'Trust' },
        A2: { fa: 'صداقت', en: 'Straightforwardness' },
        A3: { fa: 'نوع\u200Cدوستی', en: 'Altruism' },
        A4: { fa: 'همراهی', en: 'Compliance' },
        A5: { fa: 'تواضع', en: 'Modesty' },
        A6: { fa: 'درک دیگران', en: 'Tender-Mindedness' },
        C1: { fa: 'شایستگی', en: 'Competence' },
        C2: { fa: 'نظم', en: 'Order' },
        C3: { fa: 'وظیفه\u200Cشناسی', en: 'Dutifulness' },
        C4: { fa: 'تلاش برای موفقیت', en: 'Achievement Striving' },
        C5: { fa: 'خویشتن\u200Cداری', en: 'Self-Discipline' },
        C6: { fa: 'احتیاط', en: 'Deliberation' },
    };

    for (const [domain, facets] of Object.entries(scores)) {
        const domainCode = domain;
        const domainInfo =
            domainNames[domainCode] || {
                fa: domain,
                en: domain,
                desc: { fa: '', en: '' },
            };

        interpretations[domain] = {
            name: domainInfo,
            description: domainInfo.desc,
            rawScore: facets.rawScore,
            maxScore: facets.maxScore,
            tScore: facets.tScore,
            percentile: calculatePercentile(facets.rawScore, facets.maxScore),
            facets: {},
        };

        for (const [facetCode, facetData] of Object.entries(facets.facets)) {
            const facetInfo =
                facetDescriptions[facetCode] || { fa: facetCode, en: facetCode };
            interpretations[domain].facets[facetCode] = {
                name: facetInfo,
                rawScore: facetData.rawScore,
                maxScore: facetData.maxScore,
                tScore: facetData.tScore,
                percentile: calculatePercentile(
                    facetData.rawScore,
                    facetData.maxScore,
                ),
            };
        }
    }

    return interpretations;
};

const calculateNEOScore = (answers, questions) => {
    const scores = {
        N: { rawScore: 0, maxScore: 0, facets: {} },
        E: { rawScore: 0, maxScore: 0, facets: {} },
        O: { rawScore: 0, maxScore: 0, facets: {} },
        A: { rawScore: 0, maxScore: 0, facets: {} },
        C: { rawScore: 0, maxScore: 0, facets: {} },
    };

    const answerMap = new Map(
        answers.map((a) => [a.questionId.toString(), a.answer]),
    );

    for (const question of questions) {
        const answer = answerMap.get(question._id.toString());
        if (answer === undefined) continue;

        const domain = question.domain.en[0].toUpperCase();
        const facetCode = question.facet.code;

        if (!scores[domain]) continue;

        let finalAnswer = answer;
        if (question.isReversed) {
            finalAnswer = 6 - answer;
        }

        if (!scores[domain].facets[facetCode]) {
            scores[domain].facets[facetCode] = {
                rawScore: 0,
                maxScore: 0,
                tScore: 0,
            };
        }

        scores[domain].facets[facetCode].rawScore += finalAnswer;
        scores[domain].facets[facetCode].maxScore += 5;
        scores[domain].rawScore += finalAnswer;
        scores[domain].maxScore += 5;
    }

    for (const domain of Object.keys(scores)) {
        for (const facetCode of Object.keys(scores[domain].facets)) {
            const facet = scores[domain].facets[facetCode];
            facet.tScore = Math.round((facet.rawScore / facet.maxScore) * 100);
        }
        scores[domain].tScore = Math.round(
            (scores[domain].rawScore / scores[domain].maxScore) * 100,
        );
    }

    return scores;
};

router.get('/:slug/result/:sessionId', optionalAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;

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
            _id: sessionId,
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

        const existingResult = await Result.findOne({ sessionId: session._id });
        if (existingResult) {
            return res.json({
                success: true,
                message: 'نتیجه از قبل محاسبه شده',
                data: existingResult,
            });
        }

        const Question = require('../models/neo/Question');
        const questions = await Question.find({
            testId: test._id,
            isActive: true,
        });

        const scores = calculateNEOScore(session.answers, questions);
        const interpretation = interpretNEO(scores);

        const result = await Result.create({
            sessionId: session._id,
            testId: test._id,
            userId: userId || undefined,
            guestToken: guestToken || undefined,
            type: test.type,
            scores,
            rawScores: scores,
            percentile: Object.fromEntries(
                Object.entries(scores).map(([d, data]) => [
                    d,
                    calculatePercentile(data.rawScore, data.maxScore),
                ]),
            ),
            interpretation,
        });

        res.json({
            success: true,
            message: 'نتیجه با موفقیت محاسبه شد',
            data: result,
        });
    } catch (error) {
        console.error('Result calculation error:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور',
        });
    }
});

router.get('/my', protect, async (req, res) => {
    try {
        const { testSlug } = req.query;

        const query = {};

        if (req.tokenType === 'user') {
            query.userId = req.user._id;
        } else if (req.tokenType === 'guest') {
            query.guestToken = req.guest.guestToken;
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
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Results fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور',
        });
    }
});

module.exports = router;