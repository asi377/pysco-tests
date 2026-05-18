import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, AlertCircle, Loader, Clock } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Test() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user, isGuest, guestLogin } = useAuth();

    const [testInfo, setTestInfo] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);

    const QUESTIONS_PER_PAGE = 5;
    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
    const currentQuestions = questions.slice(
        currentPage * QUESTIONS_PER_PAGE,
        (currentPage + 1) * QUESTIONS_PER_PAGE
    );

    useEffect(() => {
        initTest();
    }, [slug]);

    useEffect(() => {
        if (testInfo?.duration && timeLeft === null) {
            setTimeLeft(testInfo.duration * 60);
        }
    }, [testInfo]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    useEffect(() => {
        if (Object.keys(answers).length > 0 && sessionId) {
            autoSave();
        }
    }, [answers, sessionId]);

    const initTest = async () => {
        try {
            setLoading(true);

            if (!user) {
                await guestLogin();
            }

            const [testRes, questionsRes, sessionRes] = await Promise.all([
                api.tests.get(slug),
                api.tests.questions(slug),
                api.tests.createSession(slug, {}),
            ]);

            setTestInfo(questionsRes.data);
            setQuestions(questionsRes.data.questions);
            setSessionId(sessionRes.data.sessionId);

            if (sessionRes.data.resumed && sessionRes.data.sessionId) {
                const sessionData = await api.tests.getSession(slug, sessionRes.data.sessionId);
                if (sessionData.data.answers) {
                    const savedAnswers = {};
                    sessionData.data.answers.forEach((a) => {
                        savedAnswers[a.questionId] = a.answer;
                    });
                    setAnswers(savedAnswers);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const autoSave = async () => {
        if (!sessionId || Object.keys(answers).length === 0) return;

        const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
        }));

        try {
            await api.tests.submitAnswers(slug, { sessionId, answers: answersArray });
            setLastSaved(new Date());
        } catch (err) {
            console.error('Auto-save failed:', err);
        }
    };

    const handleAnswer = (questionId, value) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: value,
        }));
    };

    const handleSubmit = async (isAuto = false) => {
        setSubmitting(true);
        try {
            const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                answer,
            }));

            await api.tests.submitAnswers(slug, { sessionId, answers: answersArray });

            if (!isAuto) {
                navigate(`/result/${slug}/${sessionId}`);
            } else {
                navigate(`/result/${slug}/${sessionId}`);
            }
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader className="w-12 h-12 text-primary-500 animate-spin" />
                <p className="text-slate-500">در حال بارگذاری...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => navigate('/')}>بازگشت به صفحه اصلی</Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{testInfo?.title}</h1>
                        <p className="text-slate-500 text-sm">
                            {answeredCount} از {questions.length} سوال پاسخ داده شده
                        </p>
                    </div>
                    {timeLeft !== null && timeLeft > 0 && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                            <Clock className="w-5 h-5" />
                            <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                        className="bg-gradient-to-l from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {lastSaved && (
                    <p className="text-xs text-slate-400 mt-2 text-center">
                        ذخیره شده در {lastSaved.toLocaleTimeString('fa-IR')}
                    </p>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6">
                <div className="space-y-6">
                    {currentQuestions.map((q, idx) => {
                        const globalIndex = currentPage * QUESTIONS_PER_PAGE + idx;
                        return (
                            <div key={q.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                <div className="flex items-start gap-3 mb-4">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex-shrink-0">
                                        {globalIndex + 1}
                                    </span>
                                    <p className="text-slate-800 leading-relaxed">{q.text}</p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {q.options.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleAnswer(q.id, opt.value)}
                                            className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium
                                                ${answers[q.id] === opt.value
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between mt-6">
                <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                >
                    <ChevronRight className="w-5 h-5 ml-2" />
                    قبلی
                </Button>

                <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-3 h-3 rounded-full transition-all ${
                                currentPage === i ? 'bg-primary-500 w-8' : 'bg-slate-300'
                            }`}
                        />
                    ))}
                </div>

                {currentPage < totalPages - 1 ? (
                    <Button onClick={() => setCurrentPage((p) => p + 1)}>
                        بعدی
                        <ChevronLeft className="w-5 h-5 mr-2 rotate-180" />
                    </Button>
                ) : (
                    <Button
                        onClick={() => handleSubmit(false)}
                        loading={submitting}
                        disabled={answeredCount < questions.length}
                    >
                        <Check className="w-5 h-5 ml-2" />
                        تکمیل آزمون
                    </Button>
                )}
            </div>

            {answeredCount < questions.length && (
                <p className="text-center text-slate-500 text-sm mt-4">
                    {questions.length - answeredCount} سوال بی‌پاسخ باقی مانده
                </p>
            )}
        </div>
    );
}