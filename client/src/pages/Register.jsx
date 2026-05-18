import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const { register } = useAuth();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(formData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">ثبت‌نام</h1>
                        <p className="text-slate-500 mt-2">حساب کاربری جدید بسازید</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="نام و نام خانوادگی"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                placeholder="ایمیل"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                placeholder="رمز عبور (حداقل ۸ کاراکتر)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                minLength={8}
                                required
                            />
                        </div>

                        <Button type="submit" loading={loading} className="w-full">
                            ثبت‌نام
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-500">
                            حساب دارید؟{' '}
                            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                                وارد شوید
                            </Link>
                        </p>
                    </div>

                    <div className="mt-4 pt-6 border-t border-slate-100 text-center">
                        <Link to="/" className="text-slate-500 hover:text-primary-600 text-sm">
                            ادامه به عنوان مهمان ←
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}