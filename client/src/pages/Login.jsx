import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, User, Shield } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(formData.email, formData.password);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="card-gradient p-8 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold gradient-text mb-2">ورود به حساب</h1>
          <p className="text-slate-500">برای مشاهده نتایج وارد شوید</p>
        </div>

        {error && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
            <p className="text-brand-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              placeholder="ایمیل"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="رمز عبور"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full btn-primary py-4 text-lg">
            ورود
          </Button>
        </form>

        <div className="mt-6 p-3 bg-brand-50 rounded-2xl">
          <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            ورود مدیر: ali@gmail.com
          </p>
        </div>

        <div className="mt-8 text-center space-y-4">
          <p className="text-slate-500">
            حساب ندارید؟{' '}
            <Link to="/register" className="text-brand-600 font-bold hover:underline">
              ثبت‌نام کنید
            </Link>
          </p>

          <div className="pt-6 border-t border-slate-100">
            <Link to="/" className="text-slate-500 hover:text-brand-500 transition-colors text-sm">
              ادامه به عنوان مهمان ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
