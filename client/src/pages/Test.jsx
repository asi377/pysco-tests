import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, AlertCircle, Clock,
  X, Pause, Play, RefreshCw
} from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const LIKERT_LABELS = [
  { value: 0, short: 'کاملاً مخالفم', mobile: 'کاملاً مخالفم' },
  { value: 1, short: 'مخالفم', mobile: 'مخالفم' },
  { value: 2, short: 'نظری ندارم', mobile: 'نظری' },
  { value: 3, short: 'موافقم', mobile: 'موافقم' },
  { value: 4, short: 'کاملاً موافقم', mobile: 'کاملاً موافقم' },
];

const QUESTIONS_PER_PAGE = 10;

export default function Test() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, guestLogin } = useAuth();

  const [testInfo, setTestInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [incompleteSession, setIncompleteSession] = useState(null);

  const autoSaveTimer = useRef(null);

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const loadTest = useCallback(async (forceNew) => {
    try {
      setLoading(true);
      setShowResumeModal(false);

      const [testRes, questionsRes, sessionRes] = await Promise.all([
        api.tests.get(slug),
        api.tests.questions(slug, 'fa', 1, 300),
        api.tests.createSession(slug, forceNew ? { forceNew: true } : {}),
      ]);

      setTestInfo({ title: testRes.data.title, duration: testRes.data.duration });
      setQuestions(questionsRes.data?.questions || []);
      setSessionId(sessionRes.data.sessionId);

      if (sessionRes.data.resumed && sessionRes.data.sessionId) {
        const sessionData = await api.tests.getSession(slug, sessionRes.data.sessionId);
        if (sessionData.data?.answers) {
          const saved = {};
          sessionData.data.answers.forEach(a => { saved[a.questionId] = a.answer; });
          setAnswers(saved);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    (async () => {
      try {
        setInitialLoading(true);
        if (!user) await guestLogin();

        const [testRes, checkRes] = await Promise.all([
          api.tests.get(slug),
          api.tests.checkIncompleteSession(slug),
        ]);

        setTestInfo({ title: testRes.data.title, duration: testRes.data.duration });

        const session = checkRes.data?.session;
        if (session && session.answered > 0) {
          setIncompleteSession(session);
          setShowResumeModal(true);
        } else {
          await loadTest(false);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [slug, user, guestLogin, loadTest]);

  useEffect(() => {
    if (testInfo?.duration && timeLeft === null) {
      setTimeLeft(testInfo.duration * 60);
    }
  }, [testInfo, timeLeft]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isPaused]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSave();
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [answers, sessionId]);

  const autoSave = async () => {
    if (!sessionId || Object.keys(answers).length === 0) return;
    try {
      await api.tests.submitAnswers(slug, {
        sessionId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.tests.submitAnswers(slug, {
        sessionId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      });
      if (sessionId) navigate(`/result/${slug}/${sessionId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    autoSave();
    navigate('/');
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (initialLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">در حال بارگذاری سوالات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-brand-500 mx-auto mb-4" />
        <p className="text-brand-500 mb-4">{error}</p>
        <Button onClick={() => navigate('/')} className="btn-primary px-6 py-2">بازگشت</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-white shadow-md sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold gradient-text">{testInfo?.title}</h1>
              <p className="text-xs text-slate-500">{answeredCount} از {questions.length} سوال</p>
            </div>
            <div className="flex items-center gap-2">
              {timeLeft !== null && timeLeft > 0 && (
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm ${
                  timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-brand-100 text-brand-600'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                </div>
              )}
              <button onClick={() => setIsPaused(!isPaused)} className="p-1.5 rounded-lg bg-brand-100 text-brand-600 hover:bg-brand-200">
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowExitModal(true)} className="p-1.5 rounded-lg bg-brand-100 text-brand-600 hover:bg-brand-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full progress-gradient rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 py-4">
        {isPaused ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-10 h-10 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">آزمون متوقف شد</h2>
            <p className="text-slate-500 mb-4">برای ادامه دکمه زیر را بزنید</p>
            <Button onClick={() => setIsPaused(false)} className="btn-primary px-6 py-2">
              <Play className="w-4 h-4 ml-1" /> ادامه آزمون
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {currentQuestions.map((q, idx) => {
              const globalIndex = currentPage * QUESTIONS_PER_PAGE + idx;
              const currentAnswer = answers[q.id];
              return (
                <div key={q.id} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {globalIndex + 1}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">{q.text}</p>
                  </div>
                  <div className="flex justify-between gap-1 pr-9">
                    {LIKERT_LABELS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleAnswer(q.id, opt.value)}
                        className={`flex-1 py-1.5 px-1 rounded-lg border text-xs font-medium transition-all
                          ${currentAnswer === opt.value
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-brand-400 hover:bg-brand-50'
                          }`}
                      >
                        <span className="hidden sm:inline">{opt.short}</span>
                        <span className="sm:hidden">{opt.mobile}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 text-sm"
          >
            <ChevronRight className="w-4 h-4 ml-1" /> قبلی
          </Button>

          <div className="flex items-center gap-1.5 max-w-[40%] overflow-x-auto px-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`flex-shrink-0 h-2 rounded-full transition-all ${
                  currentPage === i ? 'bg-brand-500 w-6' : 'bg-slate-300 w-2'
                }`}
              />
            ))}
          </div>

          {currentPage < totalPages - 1 ? (
            <Button onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 text-sm">
              بعدی <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={answeredCount < questions.length}
              className="px-4 py-2 text-sm"
            >
              <Check className="w-4 h-4 ml-1" /> تکمیل
            </Button>
          )}
        </div>

        {answeredCount < questions.length && (
          <p className="text-center text-xs text-slate-400 mt-3">
            {questions.length - answeredCount} سوال بی‌پاسخ
          </p>
        )}
      </div>

      {showResumeModal && incompleteSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">آزمون ناقص یافت شد</h2>
            <p className="text-sm text-slate-500 mb-2">
              شما یک آزمون ناقص از قبل دارید ({incompleteSession.answered} از {incompleteSession.total} سوال پاسخ داده شده).
            </p>
            <p className="text-xs text-slate-400 mb-6">آیا می‌خواهید ادامه دهید یا یک آزمون جدید شروع کنید؟</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => loadTest(false)} className="w-full bg-orange-600 text-white hover:bg-orange-700 py-3 text-sm">
                <Play className="w-4 h-4 ml-1" /> ادامه آزمون قبلی
              </Button>
              <Button onClick={() => loadTest(true)} className="w-full btn-outline py-3 text-sm">
                <RefreshCw className="w-4 h-4 ml-1" /> شروع آزمون جدید
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-center mb-3">خروج از آزمون؟</h2>
            <p className="text-sm text-slate-500 text-center mb-4">پاسخ‌های شما ذخیره شده و می‌توانید بعداً ادامه دهید.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowExitModal(false)} className="flex-1 btn-outline text-sm">انصراف</Button>
              <Button onClick={handleExit} className="flex-1 bg-brand-600 text-white hover:bg-brand-700 text-sm">خروج</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
