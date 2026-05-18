import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { AlertCircle, Home, RotateCcw, TrendingUp, Award } from 'lucide-react';
import Button from '../components/Button';
import api from '../utils/api';

const domainColors = {
    N: '#ef4444',
    E: '#f59e0b',
    O: '#8b5cf6',
    A: '#10b981',
    C: '#3b82f6',
};

const domainLabels = {
    N: { fa: 'روان\u200Cنژندی', en: 'Neuroticism' },
    E: { fa: 'برون\u200Cگرایی', en: 'Extraversion' },
    O: { fa: 'گشودگی', en: 'Openness' },
    A: { fa: 'توافق\u200Cپذیری', en: 'Agreeableness' },
    C: { fa: 'وظیفه\u200Cشناسی', en: 'Conscientiousness' },
};

const levelLabels = {
    بالا: { text: 'بالا', color: 'text-red-600', bg: 'bg-red-100' },
    'متوسط به بالا': { text: 'متوسط به بالا', color: 'text-orange-600', bg: 'bg-orange-100' },
    متوسط: { text: 'متوسط', color: 'text-amber-600', bg: 'bg-amber-100' },
    پایین: { text: 'پایین', color: 'text-green-600', bg: 'bg-green-100' },
};

export default function Result() {
    const { slug, sessionId } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchResult();
    }, [slug, sessionId]);

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
                  facetName: facet.name?.fa || facet,
                  score: facetData.tScore,
                  level: facetData.percentile?.level,
                  color: domainColors[domain],
              }))
          )
        : [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
                <p className="text-slate-500">در حال محاسبه نتایج...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-500 mb-4">{error}</p>
                <Link to="/">
                    <Button>بازگشت به صفحه اصلی</Button>
                </Link>
            </div>
        );
    }

    if (!result) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="bg-gradient-to-l from-primary-600 to-secondary-600 rounded-3xl shadow-xl p-8 mb-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                    <Award className="w-12 h-12" />
                    <div>
                        <h1 className="text-2xl font-bold">نتیجه آزمون {result.testId?.title || 'شخصیت‌شناسی'}</h1>
                        <p className="opacity-80">پروفایل شخصیتی شما</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-3xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary-500" />
                        نمودار دامنه‌های شخصیتی
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
                                    stroke="#8b5cf6"
                                    fill="#8b5cf6"
                                    fillOpacity={0.4}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">خلاصه نتایج</h2>
                    <div className="space-y-4">
                        {Object.entries(result.interpretation || {}).map(([domain, data]) => {
                            const domainColor = domainColors[domain];
                            const level = levelLabels[data.percentile?.level] || levelLabels['متوسط'];
                            return (
                                <div key={domain} className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: domainColor }}
                                            />
                                            <span className="font-bold text-slate-800">
                                                {domainLabels[domain]?.fa}
                                            </span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${level.bg} ${level.color}`}>
                                            {level.text}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all"
                                            style={{
                                                width: `${data.percentile?.value}%`,
                                                backgroundColor: domainColor,
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        نمره: {data.rawScore} از {data.maxScore} ({data.percentile?.value}%)
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6">نمودار خرده‌مقیاس‌ها</h2>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={facetsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b' }} />
                            <YAxis dataKey="facetName" type="category" width={100} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                                                <p className="font-bold">{data.facetName}</p>
                                                <p className="text-sm text-slate-500">{data.domainName}</p>
                                                <p className="text-sm mt-1">
                                                    نمره: <span className="font-bold">{data.score}%</span>
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                {facetsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6">تفسیر کامل</h2>
                <div className="space-y-6">
                    {Object.entries(result.interpretation || {}).map(([domain, data]) => (
                        <div key={domain} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                            <h3 className="text-lg font-bold text-slate-800 mb-3">
                                {domainLabels[domain]?.fa}
                            </h3>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                {data.description?.fa}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.entries(data.facets || {}).map(([facetCode, facetData]) => {
                                    const level = levelLabels[facetData.percentile?.level] || levelLabels['متوسط'];
                                    return (
                                        <div
                                            key={facetCode}
                                            className={`p-3 rounded-xl ${level.bg} text-center`}
                                        >
                                            <p className="text-xs font-bold text-slate-600 mb-1">
                                                {facetData.name?.fa}
                                            </p>
                                            <p className={`font-bold ${level.color}`}>
                                                {facetData.percentile?.value}%
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/">
                    <Button variant="outline">
                        <Home className="w-5 h-5 ml-2" />
                        صفحه اصلی
                    </Button>
                </Link>
                <Button variant="secondary" onClick={() => navigate(`/test/${slug}`)}>
                    <RotateCcw className="w-5 h-5 ml-2" />
                    آزمون مجدد
                </Button>
            </div>
        </div>
    );
}