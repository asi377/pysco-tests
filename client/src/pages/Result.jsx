import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  AlertCircle, Home, RotateCcw, TrendingUp, Award,
  Brain, ChevronDown, ChevronUp,
  MessageCircle, Star, Target, Zap, Sparkles, Heart, Share2
} from 'lucide-react';
import Button from '../components/Button';
import api from '../utils/api';

const DOMAIN_CONFIG = {
  N: { fa: 'روان‌رنجوری', icon: Brain, color: '#e60000', emoji: '🧠', order: 0 },
  E: { fa: 'برون‌گرایی', icon: Zap, color: '#e67300', emoji: '💃', order: 1 },
  O: { fa: 'باز بودن به تجربه', icon: Sparkles, color: '#e6c300', emoji: '🎨', order: 2 },
  A: { fa: 'توافق‌پذیری', icon: Heart, color: '#2e7d32', emoji: '🤝', order: 3 },
  C: { fa: 'وجدانی بودن', icon: Target, color: '#1565c0', emoji: '🎯', order: 4 },
};

const INTERPRETATION_COLORS = {
  'بسیار بالا': { bg: 'bg-green-100', text: 'text-green-800', bar: '#16a34a' },
  'بالا': { bg: 'bg-blue-100', text: 'text-blue-800', bar: '#2563eb' },
  'متوسط': { bg: 'bg-amber-100', text: 'text-amber-800', bar: '#ca8a04' },
  'پایین': { bg: 'bg-orange-100', text: 'text-orange-800', bar: '#ea580c' },
  'بسیار پایین': { bg: 'bg-red-100', text: 'text-red-800', bar: '#dc2626' },
};

const LevelBar = ({ value, color }) => {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1">
      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
};

export default function Result() {
  const { slug, sessionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDomain, setExpandedDomain] = useState(null);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await api.results.get(slug, sessionId);
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResult(); }, [slug, sessionId]);

  const domains = result?.scores?.domains || [];
  const facets = result?.scores?.facets || [];

  const radarData = domains.map(d => ({
    subject: d.name,
    A: Math.round(d.averageTScore),
    fullMark: 100,
  }));

  const facetsData = facets.map(f => {
    const dCode = f.code.charAt(0);
    return {
      facetName: f.name || f.facetName,
      score: Math.round(f.tScore),
      color: DOMAIN_CONFIG[dCode]?.color || '#888',
      interpretation: f.interpretation,
    };
  });

  const areaData = domains.map(d => ({
    name: d.name,
    T: Math.round(d.averageTScore),
    raw: d.rawScore,
    interpretation: d.interpretation,
  }));

  const domainBarData = domains.map(d => ({
    name: d.name,
    T: Math.round(d.averageTScore),
    fill: DOMAIN_CONFIG[d.code]?.color || '#888',
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">در حال تحلیل نتایج...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-brand-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">خطا در دریافت نتایج</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <Link to="/"><Button className="btn-primary px-6 py-2"><Home className="w-4 h-4 ml-1" /> بازگشت</Button></Link>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen pb-16">
      <div className="hero-gradient text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-8 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <img src="/logo.jpg" alt="" className="w-10 h-10" />
            </div>
            <div>
              <p className="text-xs opacity-80">آزمون تکمیل شد</p>
              <h1 className="text-2xl font-bold">پروفایل شخصیتی شما</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {domains.map((d, i) => {
            const cfg = DOMAIN_CONFIG[d.code];
            const colors = INTERPRETATION_COLORS[d.interpretation] || INTERPRETATION_COLORS['متوسط'];
            return (
              <div
                key={d.code}
                className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm cursor-pointer hover:shadow-md transition-all"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => setExpandedDomain(expandedDomain === d.code ? null : d.code)}
              >
                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}>
                  <cfg.icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <h3 className="text-xs font-bold text-slate-700 mb-1">{d.name}</h3>
                <p className={`text-lg font-bold ${colors.text}`}>{Math.round(d.averageTScore)}</p>
                <LevelBar value={d.averageTScore} color={cfg.color} />
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium mt-1`}>
                  {d.interpretation}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700">
              <Brain className="w-4 h-4 text-brand-500" /> پنج عامل شخصیت
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  {radarData.map((d, i) => {
                    const cfg = DOMAIN_CONFIG[domains[i]?.code];
                    return (
                      <Radar key={i} name={d.subject} dataKey="A" stroke={cfg?.color || '#e60000'} fill={cfg?.color || '#e60000'} fillOpacity={0.2} strokeWidth={2} />
                    );
                  })}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700">
              <TrendingUp className="w-4 h-4 text-brand-600" /> خرده‌مقیاس‌ها
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facetsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis dataKey="facetName" type="category" width={80} tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={10}>
                    {facetsData.map((_, i) => <Cell key={i} fill={facetsData[i].color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700">
              <Award className="w-4 h-4 text-brand-500" /> نمرات خام
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainBarData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Bar dataKey="T" radius={[4, 4, 0, 0]} barSize={30}>
                    {domainBarData.map((_, i) => <Cell key={i} fill={domainBarData[i].fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700">
              <TrendingUp className="w-4 h-4 text-brand-500" /> نمرات T
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="T" stroke="#e60000" fill="#e60000" fillOpacity={0.2} strokeWidth={2} dot={{ r: 5, fill: '#e60000' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700">
            <MessageCircle className="w-4 h-4 text-brand-500" /> تفسیر نتایج
          </h2>
          <div className="space-y-2">
            {domains.map(d => {
              const isExpanded = expandedDomain === d.code;
              const colors = INTERPRETATION_COLORS[d.interpretation] || INTERPRETATION_COLORS['متوسط'];
              const cfg = DOMAIN_CONFIG[d.code];

              return (
                <div key={d.code} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedDomain(isExpanded ? null : d.code)}
                    className="w-full p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}>
                        <cfg.icon className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-bold text-slate-700">{d.name}</h3>
                        <p className="text-xs text-slate-400">{d.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                        {d.interpretation}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-slate-500 leading-relaxed mb-3 bg-brand-50 p-3 rounded-lg">
                        نمره T: {Math.round(d.averageTScore)} | نمره خام: {d.rawScore}
                      </p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                        {d.facets.map(f => {
                          const fc = INTERPRETATION_COLORS[f.interpretation] || INTERPRETATION_COLORS['متوسط'];
                          return (
                            <div key={f.code} className={`p-2 rounded-lg text-center ${fc.bg}`}>
                              <p className={`text-[10px] font-bold ${fc.text}`}>{f.name}</p>
                              <p className={`text-xs font-bold ${fc.text}`}>{Math.round(f.tScore)}</p>
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
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/"><Button className="btn-outline px-4 py-2 text-sm"><Home className="w-4 h-4 ml-1" /> صفحه اصلی</Button></Link>
          <Button className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`/test/${slug}`)}>
            <RotateCcw className="w-4 h-4 ml-1" /> آزمون مجدد
          </Button>
          <Link to="/profile"><Button className="btn-outline px-4 py-2 text-sm"><Award className="w-4 h-4 ml-1" /> پنل کاربری</Button></Link>
        </div>
      </div>
    </div>
  );
}
