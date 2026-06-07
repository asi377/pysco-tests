import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Check, AlertCircle, Clock,
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

const ANSWER_OPTIONS = [
  { value: 0, short: 'کاملاً مخالفم', mobile: 'کاملاً' },
  { value: 1, short: 'مخالفم', mobile: 'مخالف' },
  { value: 2, short: 'نظری ندارم', mobile: 'نظری' },
  { value: 3, short: 'موافقم', mobile: 'موافق' },
  { value: 4, short: 'کاملاً موافقم', mobile: 'کاملاً' },
];

export default function Test() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, guestLogin } = useAuth();

  const [testInfo, setTestInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(240);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [incompleteSession, setIncompleteSession] = useState(null);

  const initDone = useRef(false);

  const loadCurrentQuestion = async (sid) => {
    const res = await api.tests.currentQuestion(slug, sid);
    const d = res.data;
    if (d.completed) {
      navigate(`/result/${slug}/${sid}`);
      return;
    }
    setCurrentQuestion(d.question);
    setQuestionNumber(d.question.questionNumber);
    setTotalQuestions(d.progress.total);
    setAnsweredCount(d.progress.answered);
    setSelectedValue(null);
  };

  const startNewSession = async () => {
    const sessionRes = await api.tests.createSession(slug, { forceNew: true });
    const sid = sessionRes.data.sessionId;
    setSessionId(sid);
    await loadCurrentQuestion(sid);
  };

  const resumeSession = async () => {
    const sessionRes = await api.tests.createSession(slug, {});
    const sid = sessionRes.data.sessionId;
    setSessionId(sid);
    setShowResumeModal(false);
    await loadCurrentQuestion(sid);
  };

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

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
          setInitialLoading(false);
          return;
        }

        const sessionRes = await api.tests.createSession(slug, {});
        const sid = sessionRes.data.sessionId;
        setSessionId(sid);
        await loadCurrentQuestion(sid);
      } catch (err) {
        setError(err.message);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (testInfo?.duration && timeLeft === null) {
      setTimeLeft(testInfo.duration * 60);
    }
  }, [testInfo, timeLeft]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isPaused]);

  const handleSubmitAnswer = async () => {
    if (submitting || selectedValue === null || !sessionId || !currentQuestion) return;
    setSubmitting(true);
    try {
      const res = await api.tests.submitOneAnswer(slug, {
        sessionId,
        answer: { questionNumber: currentQuestion.questionNumber, value: selectedValue },
      });
      const d = res.data;
      if (d.completed) {
        navigate(`/result/${slug}/${sessionId}`);
        return;
      }
      setCurrentQuestion(d.question);
      setQuestionNumber(d.question.questionNumber);
      setTotalQuestions(d.progress.total);
      setAnsweredCount(d.progress.answered);
      setSelectedValue(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  const formatTime = (s) => {
    if (s === null) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (initialLoading && !showResumeModal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error && !currentQuestion) {
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
        <div className="max-w-2xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold gradient-text">{testInfo?.title}</h1>
              <p className="text-xs text-slate-500">سوال {questionNumber} از {totalQuestions}</p>
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
            <div className="h-full progress-gradient rounded-full transition-all duration-500" style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-6">
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
        ) : currentQuestion ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-6">
                <span className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {questionNumber}
                </span>
                <p className="text-base text-slate-800 leading-relaxed font-medium">{currentQuestion.text}</p>
              </div>

              <div className="flex flex-col gap-2">
                {ANSWER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedValue(opt.value)}
                    className={`w-full py-3 px-4 rounded-2xl border-2 text-sm font-medium transition-all text-right
                      ${selectedValue === opt.value
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400 hover:bg-brand-50'
                      }`}
                  >
                    <span className="sm:hidden">{opt.mobile}</span>
                    <span className="hidden sm:inline">{opt.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleSubmitAnswer}
                loading={submitting}
                disabled={selectedValue === null}
                className="px-12 py-3 text-base font-bold shadow-lg"
              >
                {questionNumber < totalQuestions ? (
                  <>بعدی <ChevronLeft className="w-5 h-5 mr-2" /></>
                ) : (
                  <><Check className="w-5 h-5 ml-2" /> تکمیل آزمون</>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </>
        ) : null}
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
              <Button onClick={resumeSession} className="w-full bg-orange-600 text-white hover:bg-orange-700 py-3 text-sm">
                <Play className="w-4 h-4 ml-1" /> ادامه آزمون قبلی
              </Button>
              <Button onClick={startNewSession} className="w-full btn-outline py-3 text-sm">
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
