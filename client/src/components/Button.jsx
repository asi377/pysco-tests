import { clsx } from 'clsx';

export default function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
    const variants = {
        primary: 'bg-gradient-to-l from-primary-600 to-primary-500 text-white hover:shadow-lg hover:shadow-primary-500/30',
        secondary: 'bg-gradient-to-l from-secondary-600 to-secondary-500 text-white hover:shadow-lg hover:shadow-secondary-500/30',
        outline: 'border-2 border-slate-200 text-slate-700 hover:border-primary-500 hover:text-primary-600',
        ghost: 'text-slate-600 hover:bg-slate-100',
        danger: 'bg-red-500 text-white hover:bg-red-600',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            disabled={loading}
            className={clsx(
                'rounded-xl font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    در حال بارگذاری...
                </span>
            ) : children}
        </button>
    );
}