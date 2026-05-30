import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, Calendar, Brain, TrendingUp, Award, History, Eye, RefreshCw, Star
} from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface TestResult {
  _id: string;
  testId: { slug: string; title: string; type: string };
  sessionId: { _id: string; completedAt: string; startedAt: string };
  scores: Record<string, { tScore: number; rawScore: number; maxScore: number }>;
  interpretation?: Record<string, any>;
  createdAt: string;
}

interface UserStats {
  totalTests: number;
  completedTests: number;
  averageScore: number;
  strongestTrait: string;
  weakestTrait: string;
}

const domainLabels: Record<string, { fa: string; color: string }> = {
  N: { fa: 'روان‌نژندی', color: 'text-brand-600 bg-brand-100' },
  E: { fa: 'برون‌گرایی', color: 'text-brand-500 bg-brand-50' },
  O: { fa: 'گشودگی', color: 'text-brand-700 bg-brand-100' },
  A: { fa: 'توافق‌پذیری', color: 'text-brand-800 bg-brand-50' },
  C: { fa: 'وظیفه‌شناسی', color: 'text-brand-900 bg-brand-100' },
};

export default function Profile() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      const response = await api.results.my() as any;
      const resultsData = response.data?.results || [];
      setResults(resultsData);
      
      if (resultsData.length > 0) {
        calculateStats(resultsData);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results: TestResult[]) => {
    const completedTests = results.filter(r => r.sessionId?.completedAt).length;
    
    let totalTscore = 0;
    let count = 0;
    const domainAverages: Record<string, number[]> = {};

    results.forEach(r => {
      Object.entries(r.scores || {}).forEach(([key, data]) => {
        totalTscore += data.tScore;
        count++;
        if (!domainAverages[key]) domainAverages[key] = [];
        domainAverages[key].push(data.tScore);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-brand-700';
    if (score >= 50) return 'text-brand-500';
    return 'text-brand-600';
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
              <div className="w-12 h-12 bg-brand-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-brand-700" />
              </div>
              <p className="text-3xl font-bold text-brand-700">{stats.completedTests}</p>
              <p className="text-sm text-slate-500">تکمیل شده</p>
            </div>
            
            <div className="card-gradient p-5 text-center animate-bounce-in" style={{animationDelay: '0.2s'}}>
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-3xl font-bold text-brand-600">{stats.averageScore}%</p>
              <p className="text-sm text-slate-500">میانگین نمره</p>
            </div>
            
            <div className="card-gradient p-5 text-center animate-bounce-in" style={{animationDelay: '0.3s'}}>
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-brand-500" />
              </div>
              <p className="text-lg font-bold text-brand-500">
                {domainLabels[stats.strongestTrait]?.fa || '-'}
              </p>
              <p className="text-sm text-slate-500">نقطه قوت</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
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
            {results.map((result, index) => (
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
                  {Object.entries(result.scores || {}).map(([key, data]) => (
                    <div key={key} className="text-center">
                      <div 
                        className="h-2 rounded-full bg-brand-200 mb-1"
                        style={{ width: `${data.tScore}%` }}
                      />
                      <span className={`text-xs font-bold ${getScoreColor(data.tScore)}`}>
                        {data.tScore}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Link 
                    to={`/result/${result.testId?.slug}/${result.sessionId?._id}`}
                    className="flex-1 btn-primary py-2 text-center text-sm"
                  >
                    <Eye className="w-4 h-4 inline ml-1" />
                    مشاهده
                  </Link>
                  <Link 
                    to={`/test/${result.testId?.slug}`}
                    className="flex-1 btn-outline py-2 text-center text-sm"
                  >
                    <RefreshCw className="w-4 h-4 inline ml-1" />
                    تکرار
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}