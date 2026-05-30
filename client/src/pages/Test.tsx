import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronLeft, Check, AlertCircle, Clock, 
  X, Pause, Play
} from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface Question {
  id: string;
  questionNumber: number;
  text: string;
  options: Array<{ value: number; label: string }>;
  isReversed: boolean;
}

interface TestInfo {
  title: string;
  duration: number;
}

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function Test() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, guestLogin } = useAuth();

  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const debouncedAnswers = useDebounce(answers, 1000);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const initTest = useCallback(async () => {
    try {
      setLoading(true);
      console.log('=== INIT TEST ===');

      if (!user) {
        console.log('No user, calling guestLogin');
        await guestLogin();
      }

      console.log('Fetching test data...');
      const [testRes, questionsRes, sessionRes] = await Promise.all([
        api.tests.get(slug!) as Promise<any>,
        api.tests.questions(slug!, 'fa', 1, 300) as Promise<any>,
        api.tests.createSession(slug!, {}) as Promise<any>,
      ]);

      console.log('Test info:', testRes.data);
      console.log('Session created:', sessionRes.data);

      setTestInfo({ title: testRes.data.title, duration: testRes.data.duration });
      setQuestions(questionsRes.data?.questions || []);
      setSessionId(sessionRes.data.sessionId);

      if (sessionRes.data.resumed && sessionRes.data.sessionId) {
        const sessionData = await api.tests.getSession(slug!, sessionRes.data.sessionId) as any;
        if (sessionData.data?.answers) {
          const savedAnswers: Record<string, number> = {};
          sessionData.data.answers.forEach((a: any) => {
            savedAnswers[a.questionId] = a.answer;
          });
          setAnswers(savedAnswers);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, user, guestLogin]);

  useEffect(() => {
    initTest();
  }, [initTest]);

  useEffect(() => {
    if (testInfo?.duration && timeLeft === null) {
      setTimeLeft(testInfo.duration * 60);
    }
  }, [testInfo, timeLeft]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused]);

  useEffect(() => {
    if (Object.keys(debouncedAnswers).length > 0 && sessionId && !isPaused) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => autoSave(), 500);
    }
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [debouncedAnswers, sessionId, isPaused]);

  const autoSave = async () => {
    if (!sessionId || Object.keys(answers).length === 0) return;
    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    try {
      await api.tests.submitAnswers(slug!, { sessionId, answers: answersArray });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      await api.tests.submitAnswers(slug!, { sessionId: sessionId!, answers: answersArray });
      if (sessionId) {
        navigate(`/result/${slug}/${sessionId}`);
      }
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    autoSave();
    navigate('/');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-xl text-slate-600 animate-pulse">در حال بارگذاری سوالات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-brand-500" />
        </div>
        <p className="text-brand-500 mb-6">{error}</p>
        <Button onClick={() => navigate('/')} className="btn-primary px-8 py-3">
          بازگشت
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-white shadow-lg sticky top-20 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold gradient-text">{testInfo?.title}</h1>
              <p className="text-slate-500 text-sm">
                {answeredCount} از {questions.length} سوال
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {timeLeft !== null && timeLeft > 0 && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${
                  timeLeft < 300 ? 'bg-brand-100 text-brand-600 animate-pulse' : 'bg-brand-100 text-brand-600'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                </div>
              )}
              
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-xl bg-brand-100 text-brand-600 hover:bg-brand-200 transition-all"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowExitModal(true)}
                className="p-2 rounded-xl bg-brand-100 text-brand-600 hover:bg-brand-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full progress-gradient rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {lastSaved && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              ذخیره شده در {lastSaved.toLocaleTimeString('fa-IR')}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card-gradient p-6">
          {isPaused ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Pause className="w-12 h-12 text-brand-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">آزمون متوقف شد</h2>
              <p className="text-slate-500 mb-6">برای ادامه دکمه زیر را بزنید</p>
              <Button onClick={() => setIsPaused(false)} className="btn-primary px-8 py-3">
                <Play className="w-5 h-5 ml-2" />
                ادامه آزمون
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {currentQuestions.map((q, idx) => {
                const globalIndex = currentPage * QUESTIONS_PER_PAGE + idx;
                return (
                  <div key={q.id} className="border-b border-brand-100 pb-8 last:border-0 last:pb-0">
                    <div className="flex items-start gap-4 mb-6">
                      <span className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {globalIndex + 1}
                      </span>
                      <p className="text-slate-800 leading-relaxed text-lg font-medium">{q.text}</p>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(q.id, opt.value)}
                          className={`p-4 rounded-2xl border-2 transition-all font-semibold text-center
                            ${answers[q.id] === opt.value
                              ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-lg shadow-brand-200'
                              : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-600'
                            }`}
                        >
                          <span className="text-2xl mb-1 block">{opt.label.split(' ')[0]}</span>
                          <span className="text-xs">{opt.label.split(' ').slice(1).join(' ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="btn-outline px-6 py-3"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            قبلی
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-3 rounded-full transition-all ${
                  currentPage === i ? 'bg-gradient-to-r from-brand-500 to-brand-600 w-8' : 'bg-slate-300 w-3'
                }`}
              />
            ))}
          </div>

          {currentPage < totalPages - 1 ? (
            <Button onClick={() => setCurrentPage((p) => p + 1)} className="btn-primary px-6 py-3">
              بعدی
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmit()}
              loading={submitting}
              disabled={answeredCount < questions.length}
              className="btn-primary px-6 py-3"
            >
              <Check className="w-5 h-5 ml-2" />
              تکمیل آزمون
            </Button>
          )}
        </div>

        {answeredCount < questions.length && (
          <p className="text-center text-slate-500 mt-4">
            {questions.length - answeredCount} سوال بی‌پاسخ
          </p>
        )}
      </div>

      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-bounce-in">
            <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">خروج از آزمون؟</h2>
            <p className="text-slate-500 text-center mb-6">
              آیا مطمئن هستید؟ پاسخ‌های شما ذخیره شده و می‌توانید بعداً ادامه دهید.
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowExitModal(false)} 
                className="flex-1 btn-outline"
              >
                انصراف
              </Button>
              <Button 
                onClick={handleExit} 
                className="flex-1 bg-brand-500 text-white hover:bg-brand-600"
              >
                خروج
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}