import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Mail, Calendar, Eye, TrendingUp, Shield, AlertTriangle, CheckCircle, X, ChevronDown, ChevronUp
} from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setError('دسترسی ادمین لازم است');
      setLoading(false);
      return;
    }
    fetchSharedResults();
  }, [user]);

  const fetchSharedResults = async () => {
    try {
      setLoading(true);
      const response = await api.admin.sharedResults();
      setResults(response.data?.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">خطا</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        {user?.role !== 'admin' && (
          <Link to="/"><Button className="btn-primary px-6 py-2">بازگشت</Button></Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="hero-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">پنل مدیریت</h1>
                <p className="opacity-80">{user?.fullName || 'مدیر'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchSharedResults} className="bg-white/20 text-white hover:bg-white/30 px-4 py-2 text-sm">
                <TrendingUp className="w-4 h-4 ml-1" /> بروزرسانی
              </Button>
              <Link to="/">
                <Button className="bg-white/20 text-white hover:bg-white/30 px-4 py-2 text-sm">
                  صفحه اصلی
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-500" />
            نتایج ارسال شده به مدیر
          </h2>
          <span className="text-sm text-slate-500">{results.length} نتیجه</span>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-12 h-12 text-brand-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">نتیجه‌ای ارسال نشده</h3>
            <p className="text-slate-500">هنوز هیچ کاربری نتیجه خود را برای مدیر ارسال نکرده است.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => {
              const userInfo = result.userId || {};
              const domains = result.scores?.domains || [];
              const validityBadge = result.validityBadge || {};
              const isExpanded = expanded === result._id;

              return (
                <div key={result._id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{userInfo.fullName || 'ناشناس'}</h3>
                          <p className="text-xs text-slate-500">{userInfo.email || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          validityBadge.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {validityBadge.color === 'red' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {validityBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(result.createdAt)}</span>
                      <span>جنسیت: {userInfo.gender || 'نامشخص'}</span>
                      <span>آزمون: {result.testId?.title || 'نئو-PI-R'}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {domains.map(d => (
                        <div key={d.code} className="text-center">
                          <p className="text-[10px] text-slate-500 mb-1">{d.code}</p>
                          <p className="text-sm font-bold">{Math.round(d.averageTScore)}</p>
                          <div className="h-1.5 rounded-full bg-slate-200 mt-1">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(d.averageTScore, 100)}%`, backgroundColor: DOMAIN_COLORS[d.code] || '#e60000' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setExpanded(isExpanded ? null : result._id)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-brand-600 hover:text-brand-700 py-2"
                    >
                      {isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isExpanded && result.scores?.facets && (
                      <div className="border-t border-slate-100 pt-3 mt-1">
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {result.scores.facets.map(f => (
                            <div key={f.code} className="bg-slate-50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-slate-500">{f.code}</p>
                              <p className="text-xs font-bold">{Math.round(f.tScore)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const DOMAIN_COLORS = {
  N: '#e60000', E: '#e67300', O: '#e6c300', A: '#2e7d32', C: '#1565c0',
};
