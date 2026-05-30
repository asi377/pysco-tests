import { useState } from 'react';
import { User, LogOut, Menu, X, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-brand-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.jpg" alt="Chuckles" className="w-12 h-12" />
            <span className="text-2xl font-extrabold gradient-text">Chuckles</span>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-all"
              >
                <Shield className="w-5 h-5" />
                پنل مدیریت
              </Link>
            )}
            {user && (
              <>
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-100 to-brand-200 text-brand-700 font-semibold hover:from-brand-200 hover:to-brand-300 transition-all"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  پنل کاربری
                </Link>
                
                <div className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-2xl',
                  isGuest 
                    ? 'bg-gradient-to-r from-brand-100 to-brand-200 text-brand-700' 
                    : 'bg-gradient-to-r from-brand-100 to-brand-200 text-brand-700'
                )}>
                  <User className="w-5 h-5" />
                  <span className="font-semibold">
                    {user.fullName || (isGuest ? 'مهمان' : 'کاربر')}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-50 text-brand-600 font-semibold hover:bg-brand-100 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  خروج
                </button>
              </>
            )}
            
            {!user && (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-outline px-6 py-2.5">
                  ورود
                </Link>
                <Link to="/register" className="btn-primary px-6 py-2.5">
                  ثبت‌نام
                </Link>
              </div>
            )}
          </div>

          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl bg-brand-50 text-brand-600"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-brand-100 animate-slide-up">
            {user ? (
              <div className="space-y-3">
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 text-red-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Shield className="w-5 h-5" />
                    پنل مدیریت
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand-50 text-brand-700"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  پنل کاربری
                </Link>
                
                <div className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand-50 text-brand-700'
                )}>
                  <User className="w-5 h-5" />
                  <span>{user.fullName || 'مهمان'}</span>
                </div>
                
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-brand-50 text-brand-600"
                >
                  <LogOut className="w-5 h-5" />
                  خروج
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link 
                  to="/login" 
                  className="btn-outline w-full text-center block py-3"
                  onClick={() => setMobileOpen(false)}
                >
                  ورود
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary w-full text-center block py-3"
                  onClick={() => setMobileOpen(false)}
                >
                  ثبت‌نام
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
