import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, Calendar, Brain, TrendingUp, Award, History, Eye, RefreshCw, Star, Trash2, Send, Play
} from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const domainLabels = {
  N: { fa: 'روان‌رنجوری', color: 'text-red-800 bg-red-100' },
  E: { fa: 'برون‌گرایی', color: 'text-orange-800 bg-orange-100' },
  O: { fa: 'گشودگی', color: 'text-yellow-800 bg-yellow-100' },
  A: { fa: 'توافق‌پذیری', color: 'text-green-800 bg-green-100' },
  C: { fa: 'وجدانی بودن', color: 'text-blue-800 bg-blue-100' },
};

export default function Profile() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [incompleteSessions, setIncompleteSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchResults();
  }, [user, navigate]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const [resultsRes, incompleteRes] = await Promise.all([
        api.results.my(),
        api.results.myIncomplete(),
      ]);
      const resultsData = resultsRes.data?.results || [];
      setResults(resultsData);
      setIncompleteSessions(incompleteRes.data?.sessions || []);
      
      if (resultsData.length > 0) {
        calculateStats(resultsData);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results) => {
    const completedTests = results.filter(r => r.sessionId?.completedAt).length;
    
    let totalTscore = 0;
    let count = 0;
    const domainAverages = {};

    results.forEach(r => {
      const domains = r.scores?.domains || [];
      domains.forEach(d => {
        totalTscore += d.averageTScore;
        count++;
        if (!domainAverages[d.code]) domainAverages[d.code] = [];
        domainAverages[d.code].push(d.averageTScore);
      });
    });

    const avgScores = Object.entries(domainAverages).map(([key, scores]) => ({
      key,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    avgScores.sort((a, b) => b.avg - a.avg);

    setStats({
      totalTests: results.length,
      completedTests,
      averageScore: count > 0 ? Math.round(totalTscore / count) : 0,
      strongestTrait: avgScores[0]?.key || '',
      weakestTrait: avgScores[avgScores.length - 1]?.key || '',
    });
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.results.delete(id);
      setResults(prev => prev.filter(r => r._id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleShareWithAdmin = async (sessionId) => {
    setSendingId(sessionId);
    try {
      await api.scoring.share({ sessionId });
      setResults(prev => prev.map(r => 
        r.sessionId?._id === sessionId ? { ...r, sharedWithAdmin: true } : r
      ));
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setSendingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-700';
    if (score >= 50) return 'text-blue-700';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="hero-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <img src="/logo.jpg" alt="Chuckles" className="w-14 h-14" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user?.fullName || 'کاربر'}</h1>
              <p className="opacity-80 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email || 'مهمان'}
              </p>
              {isGuest && (
                <span className="inline-block mt-2 px-4 py-1 bg-white/20 rounded-full text-sm">
                  حساب مهمان
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="max-w-6xl mx-auto px-4 -mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-gradient p-5 text-center animate-bounce-in">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-3xl font-bold gradient-text">{stats.totalTests}</p>
              <p className="text-sm text-slate-500">تعداد آزمون</p>
            </div>
            
            <div className="card-gradient p-5 text-center animate-bounce-in" style={{animationDelay: '0.1s'}}>
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-3xl font-bold text-brand-700">{stats.completedTests}</p>
              <p className="text-sm text-slate-500">تکمیل شده</p>
            </div>
            
            <div className="card-gradient p-5 text-center animate-bounce-in" style={{animationDelay: '0.2s'}}>
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-3xl font-bold text-brand-700">{stats.averageScore}%</p>
              <p className="text-sm text-slate-500">میانگین نمره</p>
            </div>
            
            <div className="card-gradient p-5 text-center animate-bounce-in" style={{animationDelay: '0.3s'}}>
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-lg font-bold text-brand-700">
                {domainLabels[stats.strongestTrait]?.fa || '-'}
              </p>
              <p className="text-sm text-slate-500">نقطه قوت</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {incompleteSessions.length > 0 && (
          <>
            <h2 className="text-xl font-bold flex items-center gap-3 mb-4">
              <Play className="w-5 h-5 text-orange-500" />
              آزمون‌های ناقص
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {incompleteSessions.map((s) => (
                <div key={s._id} className="card-gradient p-5 border-2 border-orange-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Brain className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{s.testId?.title || 'نئو'}</h3>
                      <p className="text-xs text-slate-500">
                        {formatDate(s.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>پیشرفت</span>
                      <span>{s.answered} از {s.total}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="h-2 bg-orange-500 rounded-full" style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                  <Link to={`/test/${s.testId?.slug}`}>
                    <Button className="w-full bg-orange-600 text-white hover:bg-orange-700 py-2 text-sm">
                      <Play className="w-4 h-4 ml-1" />
                      ادامه آزمون
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <History className="w-6 h-6 text-brand-500" />
            تاریخچه آزمون‌ها
          </h2>
          <Button onClick={fetchResults} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-2" />
            بروزرسانی
          </Button>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
              <Brain className="w-12 h-12 text-brand-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">هنوز آزمونی ندارید</h3>
            <p className="text-slate-500 mb-6">اولین آزمون خود را شروع کنید!</p>
            <Link to="/">
              <Button className="btn-primary px-8 py-3">
                شروع آزمون
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result, index) => {
              const sessionId = result.sessionId?._id;
              const isShared = result.sharedWithAdmin;
              return (
                <div 
                  key={result._id}
                  className="card-gradient p-6 hover:scale-105 transition-all animate-slide-up"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{result.testId?.title || 'نئو'}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(result.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {(result.scores?.domains || []).map(d => (
                      <div key={d.code} className="text-center">
                        <div className="h-2 rounded-full bg-slate-200 mb-1">
                          <div className="h-2 rounded-full" style={{ width: `${Math.min(d.averageTScore, 100)}%`, backgroundColor: DOMAIN_COLORS[d.code] || '#e60000' }} />
                        </div>
                        <span className={`text-xs font-bold ${getScoreColor(d.averageTScore)}`}>
                          {Math.round(d.averageTScore)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link 
                        to={`/result/${result.testId?.slug}/${result.sessionId?._id}`}
                        className="flex-1 bg-brand-600 text-white hover:bg-brand-700 px-3 py-2 text-center text-sm rounded-2xl font-bold transition-all"
                      >
                        <Eye className="w-4 h-4 inline ml-1" />
                        مشاهده
                      </Link>
                      <Link 
                        to={`/test/${result.testId?.slug}`}
                        className="flex-1 border-2 border-brand-400 text-brand-700 hover:bg-brand-50 px-3 py-2 text-center text-sm rounded-2xl font-semibold transition-all"
                      >
                        <RefreshCw className="w-4 h-4 inline ml-1" />
                        تکرار
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShareWithAdmin(sessionId)}
                        disabled={sendingId === sessionId || isShared}
                        className={`flex-1 px-3 py-2 text-center text-sm rounded-2xl font-semibold transition-all ${
                          isShared
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'border-2 border-brand-400 text-brand-700 hover:bg-brand-50'
                        }`}
                      >
                        <Send className="w-4 h-4 inline ml-1" />
                        {isShared ? 'ارسال شده' : sendingId === sessionId ? 'در حال ارسال...' : 'ارسال برای مدیر'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(result._id)}
                        className="px-3 py-2 text-sm rounded-2xl font-semibold transition-all border-2 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-base font-bold">حذف آزمون</h2>
              <p className="text-sm text-slate-500 mt-2">آیا از حذف این آزمون اطمینان دارید؟ این عمل قابل بازگشت نیست.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setConfirmDelete(null)} className="flex-1 btn-outline text-sm" disabled={deletingId === confirmDelete}>لغو</Button>
              <Button onClick={() => handleDelete(confirmDelete)} loading={deletingId === confirmDelete} className="flex-1 bg-red-600 text-white hover:bg-red-700 text-sm">
                <Trash2 className="w-4 h-4 ml-1" /> حذف
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DOMAIN_COLORS = {
  N: '#e60000',
  E: '#e67300',
  O: '#e6c300',
  A: '#2e7d32',
  C: '#1565c0',
};
