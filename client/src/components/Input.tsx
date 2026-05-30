import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, type = 'text', error, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={`w-full px-4 py-3 bg-brand-50 border rounded-xl outline-none transition-all
            ${error
              ? 'border-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
              : 'border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
            }`}
          aria-invalid={!!error}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500"
            aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-brand-500" role="alert">{error}</p>}
    </div>
  );
}