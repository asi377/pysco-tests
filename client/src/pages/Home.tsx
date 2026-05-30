import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Clock, FileQuestion, AlertCircle, Sparkles, Shield, Heart, Target, Brain } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface Test {
  _id?: string;
  id?: string;
  slug: string;
  title: string;
  type: string;
  description?: string;
  totalQuestions: number;
  duration: number;
}

const features = [
  { icon: Brain, title: 'تست‌های علمی', desc: 'بر اساس پرسشنامه‌های معتبر', color: 'from-brand-500 to-brand-600' },
  { icon: Sparkles, title: 'نتایج فوری', desc: 'تحلیل کامل شخصیت', color: 'from-brand-400 to-brand-500' },
  { icon: Shield, title: 'حریم خصوصی', desc: 'اطلاعات محفوظ', color: 'from-brand-600 to-brand-700' },
  { icon: Heart, title: 'بدون محدودیت', desc: 'هر زمان آزمون دهید', color: 'from-brand-500 to-brand-600' },
];

export default function Home() {
  const { user, guestLogin } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingGuest, setCreatingGuest] = useState(false);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.tests.list(1, 10) as any;
      setTests(response.data?.tests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleStartAsGuest = async () => {
    setCreatingGuest(true);
    try {
      await guestLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingGuest(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      neo: 'from-brand-500 to-brand-600',
      mbti: 'from-brand-400 to-brand-500',
      disc: 'from-brand-600 to-brand-700',
    };
    return colors[type] || 'from-slate-500 to-slate-600';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { neo: 'نئو', mbti: 'MBTI', disc: 'DISC' };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-xl text-slate-600 animate-pulse">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-48 h-48 bg-white rounded-full animate-float" />
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-white rounded-full animate-float" style={{animationDelay: '1s'}} />
          <div className="absolute top-40 right-40 w-24 h-24 bg-white rounded-full animate-float" style={{animationDelay: '2s'}} />
        </div>
        
        <div className="max-w-6xl mx-auto px-4 py-20 relative">
          <div className="text-center">
            <div className="w-32 h-32 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
              <img src="/logo.jpg" alt="Chuckles" className="w-20 h-20" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
              شناخت <span className="text-yellow-200">خودت</span>
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
              با آزمون‌های علمی شخصیت‌شناسی، نقاط قوت و ضعف خود را بشناسید
            </p>
            
            {!user && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button onClick={handleStartAsGuest} loading={creatingGuest} className="bg-white text-brand-600 hover:bg-brand-50 px-8 py-4 text-lg font-bold shadow-xl">
                  شروع به عنوان مهمان
                </Button>
                <Link to="/register">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white/20 px-8 py-4 text-lg font-bold">
                    ثبت‌نام / ورود
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="card-gradient p-6 text-center animate-bounce-in" style={{animationDelay: `${i * 0.1}s`}}>
              <div className={`w-14 h-14 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <f.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {!user && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="card-gradient p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">مهمان هستید؟</h2>
            <p className="text-slate-500 mb-6">
              بدون ثبت‌نام آزمون دهید. نتایج با کد ذخیره می‌شود و با ثبت‌نام حفظ خواهد شد.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={handleStartAsGuest} loading={creatingGuest} className="btn-primary px-6 py-3">
                شروع به عنوان مهمان
              </Button>
              <Link to="/register">
                <Button variant="outline" className="btn-outline px-6 py-3">
                  ثبت‌نام کنید
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
            <p className="text-brand-600">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Target className="w-8 h-8 text-brand-500" />
          آزمون‌های موجود
        </h2>
        <p className="text-slate-500 mb-8">یکی را انتخاب کنید و شروع کنید</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test, index) => (
            <div 
              key={test._id || test.id}
              className="card-gradient overflow-hidden hover:scale-105 transition-all animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className={`h-3 bg-gradient-to-r ${getTypeColor(test.type)}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getTypeColor(test.type)} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <img src="/logo.jpg" alt="" className="w-8 h-8" />
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getTypeColor(test.type)} text-white`}>
                    {getTypeLabel(test.type)}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2">{test.title}</h3>
                {test.description && (
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{test.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                  <span className="flex items-center gap-2 bg-brand-50 px-3 py-1 rounded-full">
                    <FileQuestion className="w-4 h-4 text-brand-500" />
                    {test.totalQuestions} سوال
                  </span>
                  {test.duration > 0 && (
                    <span className="flex items-center gap-2 bg-brand-50 px-3 py-1 rounded-full">
                      <Clock className="w-4 h-4 text-brand-500" />
                      {test.duration} دقیقه
                    </span>
                  )}
                </div>

                <Link to={`/test/${test.slug}`}>
                  <Button className="w-full btn-primary py-3">
                    <span>شروع آزمون</span>
                    <ChevronLeft className="w-5 h-5 mr-2" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {tests.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
              <Brain className="w-12 h-12 text-brand-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">هنوز آزمونی تعریف نشده</h3>
            <p className="text-slate-500">به زودی آزمون‌های جدید اضافه می‌شوند</p>
          </div>
        )}
      </div>
    </div>
  );
}