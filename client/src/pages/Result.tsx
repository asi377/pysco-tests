import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell
} from 'recharts';
import { 
  AlertCircle, Home, RotateCcw, TrendingUp, Award, 
  CheckCircle, Brain, ChevronDown, ChevronUp,
  MessageCircle, Star, Heart, Target, Zap, Sparkles
} from 'lucide-react';
import Button from '../components/Button';
import api from '../utils/api';

interface DomainData {
  tScore: number;
  rawScore: number;
  maxScore: number;
  percentile?: { level: string; value: number };
  facets?: Record<string, any>;
  description?: { fa: string };
  name?: { fa: string };
}

interface Result {
  testId?: { title: string; type: string };
  scores: Record<string, DomainData>;
  interpretation?: Record<string, DomainData>;
  createdAt?: string;
}

const domainColors: Record<string, string> = {
  N: '#e60000',
  E: '#cc0000',
  O: '#990000',
  A: '#660000',
  C: '#330000',
};

const domainLabels: Record<string, { fa: string; icon: any; desc: string }> = {
  N: { 
    fa: 'روان‌نژندی', 
    icon: Heart,
    desc: 'توانایی مدیریت استرس و ثبات هیجانی'
  },
  E: { 
    fa: 'برون‌گرایی', 
    icon: Zap,
    desc: 'میزان انرژی و تعامل اجتماعی'
  },
  O: { 
    fa: 'گشودگی', 
    icon: Sparkles,
    desc: 'علاقه به تجربه‌های جدید و خلاقیت'
  },
  A: { 
    fa: 'توافق‌پذیری', 
    icon: Heart,
    desc: 'میزان همکاری و اعتماد به دیگران'
  },
  C: { 
    fa: 'وظیفه‌شناسی', 
    icon: Target,
    desc: 'سازمان‌دهی و مسئولیت‌پذیری'
  },
};

const levelConfig: Record<string, { text: string; color: string; bg: string; icon: any }> = {
  بالا: { text: 'بالا', color: 'text-brand-600', bg: 'bg-brand-100', icon: Star },
  'متوسط به بالا': { text: 'متوسط به بالا', color: 'text-brand-500', bg: 'bg-brand-50', icon: TrendingUp },
  متوسط: { text: 'متوسط', color: 'text-slate-600', bg: 'bg-slate-100', icon: CheckCircle },
  پایین: { text: 'پایین', color: 'text-slate-500', bg: 'bg-slate-50', icon: Award },
};

export default function Result() {
  const { slug, sessionId } = useParams<{ slug: string; sessionId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const fetchResult = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING RESULT ===');
      console.log('Slug:', slug);
      console.log('SessionId:', sessionId);
      
      const response = await api.results.get(slug!, sessionId!) as any;
      console.log('Response:', response);
      
      setResult(response.data);
    } catch (err: any) {
      console.error('Error fetching result:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [slug, sessionId]);

  const radarData = result
    ? Object.entries(result.scores).map(([key, data]) => ({
        subject: domainLabels[key]?.fa || key,
        A: data.tScore,
        fullMark: 100,
      }))
    : [];

  const facetsData = result
    ? Object.entries(result.interpretation || {}).flatMap(([domain, domainData]) =>
        Object.entries(domainData.facets || {}).map(([facet, facetData]) => ({
          domain,
          domainName: domainLabels[domain]?.fa,
          facet,
          facetName: facetData.name?.fa || facet,
          score: facetData.tScore,
          level: facetData.percentile?.level,
          color: domainColors[domain] || '#888',
        }))
      )
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-xl text-slate-600 animate-pulse">در حال تحلیل نتایج...</p>
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
        <h2 className="text-2xl font-bold text-slate-800 mb-4">خطا در دریافت نتایج</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Link to="/">
          <Button className="btn-primary px-8 py-3">
            <Home className="w-5 h-5 ml-2" />
            بازگشت
          </Button>
        </Link>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen pb-20">
      <div className="hero-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full animate-float" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full animate-float" style={{animationDelay: '1s'}} />
        </div>
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center animate-pulse-glow">
              <img src="/logo.jpg" alt="Chuckles" className="w-16 h-16" />
            </div>
            <div>
              <p className="opacity-80 text-sm">آزمون تکمیل شد</p>
              <h1 className="text-4xl font-extrabold mb-2">پروفایل شخصیتی شما</h1>
              <p className="opacity-80">{result.testId?.title || 'نئو-PI-R'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(result.scores).map(([key, data], index) => {
            const level = levelConfig[data.percentile?.level || 'متوسط'] || levelConfig['متوسط'];
            const Icon = level.icon;
            return (
              <div 
                key={key}
                className={`card-gradient p-4 text-center animate-bounce-in cursor-pointer hover:scale-105 transition-all`}
                style={{animationDelay: `${index * 0.1}s`}}
                onClick={() => setExpandedDomain(expandedDomain === key ? null : key)}
              >
                <div 
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${domainColors[key]}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: domainColors[key] }} />
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{domainLabels[key]?.fa}</h3>
                <p className={`text-2xl font-bold ${level.color}`}>{data.tScore}%</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card-gradient p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Brain className="w-6 h-6 text-brand-500" />
              نمودار پنج عامل شخصیت
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                  <Radar
                    name="نمره"
                    dataKey="A"
                    stroke="#e60000"
                    fill="#e60000"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-gradient p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-brand-600" />
              نمودار خرده‌مقیاس‌ها
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facetsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b' }} />
                  <YAxis dataKey="facetName" type="category" width={80} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                    {facetsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-brand-500" />
            تفسیر کامل نتایج
          </h2>

          {Object.entries(result.interpretation || {}).map(([domain, data]) => {
            const isExpanded = expandedDomain === domain;
            const level = levelConfig[data.percentile?.level || 'متوسط'] || levelConfig['متوسط'];
            const Icon = level.icon;
            
            return (
              <div key={domain} className="card-gradient overflow-hidden">
                <button
                  onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                  className="w-full p-6 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${domainColors[domain]}20` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: domainColors[domain] }} />
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl font-bold text-slate-800">{domainLabels[domain]?.fa}</h3>
                      <p className="text-slate-500 text-sm">{domainLabels[domain]?.desc}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${level.bg} ${level.color}`}>
                        {level.text}
                      </span>
                      <p className="text-sm text-slate-500 mt-1">
                        {data.percentile?.value || 0}% - {data.rawScore} از {data.maxScore}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 animate-slide-up">
                    <p className="text-slate-600 leading-relaxed mb-6 bg-brand-50 p-4 rounded-2xl">
                      {data.description?.fa}
                    </p>
                    
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {Object.entries(data.facets || {}).map(([facetCode, facetData]) => {
                        const facetLevel = levelConfig[facetData.percentile?.level || 'متوسط'] || levelConfig['متوسط'];
                        return (
                          <div 
                            key={facetCode}
                            className={`p-3 rounded-xl text-center ${facetLevel.bg}`}
                          >
                            <p className={`text-xs font-bold ${facetLevel.color}`}>
                              {facetData.name?.fa}
                            </p>
                            <p className={`text-lg font-bold mt-1 ${facetLevel.color}`}>
                              {facetData.percentile?.value || 0}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/">
            <Button className="btn-outline px-6 py-3">
              <Home className="w-5 h-5 ml-2" />
              صفحه اصلی
            </Button>
          </Link>
          
          <Button 
            className="btn-primary px-6 py-3"
            onClick={() => navigate(`/test/${slug}`)}
          >
            <RotateCcw className="w-5 h-5 ml-2" />
            آزمون مجدد
          </Button>
          
          <Link to="/profile">
            <Button className="btn-secondary px-6 py-3">
              <Award className="w-5 h-5 ml-2" />
              پنل کاربری
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}