import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ChevronLeft, Clock, FileQuestion, AlertCircle } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Home() {
    const { user, isGuest, guestLogin } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creatingGuest, setCreatingGuest] = useState(false);

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const response = await api.tests.list();
            setTests(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStartAsGuest = async () => {
        setCreatingGuest(true);
        try {
            await guestLogin();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreatingGuest(false);
        }
    };

    const getTypeLabel = (type) => {
        const labels = { neo: 'نئو', mbti: 'MBTI', disc: 'DISC' };
        return labels[type] || type;
    };

    const getTypeColor = (type) => {
        const colors = {
            neo: 'from-blue-500 to-cyan-500',
            mbti: 'from-purple-500 to-pink-500',
            disc: 'from-amber-500 to-orange-500',
        };
        return colors[type] || 'from-slate-500 to-slate-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {!user && (
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">به جمع آزمون‌دهندگان بپیوندید</h2>
                    <p className="text-slate-600 mb-6 max-w-xl mx-auto">
                        می‌توانید بدون ثبت‌نام به عنوان مهمان آزمون دهید. نتایج شما با یک توکن ذخیره می‌شود.
                        {' '}در صورت ثبت‌نام، نتایج قبلی حفظ خواهد شد.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Button onClick={handleStartAsGuest} loading={creatingGuest}>
                            شروع به عنوان مهمان
                        </Button>
                        <Link to="/register">
                            <Button variant="outline">ثبت‌نام / ورود</Button>
                        </Link>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">آزمون‌های موجود</h2>
                <p className="text-slate-500 mt-1">یکی از آزمون‌ها را انتخاب کنید</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                    <div
                        key={test._id || test.id}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all group"
                    >
                        <div className={`h-2 bg-gradient-to-l ${getTypeColor(test.type)}`} />
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeColor(test.type)} flex items-center justify-center shadow-lg`}>
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-l ${getTypeColor(test.type)} text-white`}>
                                    {getTypeLabel(test.type)}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">{test.title}</h3>
                            {test.description && (
                                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{test.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <span className="flex items-center gap-1">
                                    <FileQuestion className="w-4 h-4" />
                                    {test.totalQuestions} سوال
                                </span>
                                {test.duration > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {test.duration} دقیقه
                                    </span>
                                )}
                            </div>

                            <Link to={`/test/${test.slug}`}>
                                <Button className="w-full group-hover:shadow-lg transition-shadow">
                                    <span>شروع آزمون</span>
                                    <ChevronLeft className="w-5 h-5 rotate-180 mr-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {tests.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p>هنوز آزمونی تعریف نشده است</p>
                </div>
            )}
        </div>
    );
}