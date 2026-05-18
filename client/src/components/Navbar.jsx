import { Brain, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export default function Navbar() {
    const { user, isGuest, logout } = useAuth();

    return (
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-slate-800">تست شخصیت‌شناسی</span>
                    </div>

                    {user && (
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-full',
                                isGuest ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                            )}>
                                <User className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {user.fullName || (isGuest ? 'کاربر مهمان' : 'کاربر')}
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}